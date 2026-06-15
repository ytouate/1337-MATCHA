from typing import Any

from fastapi import HTTPException, status

from src.db.database import PgDatabase
from src.schemas.suggestion import (
    SortBy,
    SortOrder,
    SuggestedProfile,
    SuggestionListResponse,
    SuggestionQuery,
)
from src.services.user_service import _image_public_url

DEFAULT_SORT_ORDER = {
    SortBy.DISTANCE: SortOrder.ASC,
    SortBy.AGE: SortOrder.ASC,
    SortBy.FAME: SortOrder.DESC,
    SortBy.COMMON_TAGS: SortOrder.DESC,
}

SORT_COLUMN = {
    SortBy.DISTANCE: "distance_km",
    SortBy.AGE: "age",
    SortBy.FAME: "fame_rating",
    SortBy.COMMON_TAGS: "common_interest_count",
}


def _parse_tags(tags: str | None) -> list[str]:
    if not tags:
        return []
    return [tag.strip() for tag in tags.split(",") if tag.strip()]


def _build_suggestions_query(query: SuggestionQuery) -> tuple[str, str, dict[str, Any]]:
    order = query.order or DEFAULT_SORT_ORDER[query.sort_by]
    sort_column = SORT_COLUMN[query.sort_by]
    order_sql = "ASC" if order == SortOrder.ASC else "DESC"

    tag_list = _parse_tags(query.tags)
    tag_filter_sql = ""
    if tag_list:
        tag_filter_sql = """
            AND EXISTS (
                SELECT 1
                FROM user_interests ui_tag
                JOIN interests i_tag ON i_tag.id = ui_tag.interest_id
                WHERE ui_tag.user_id = u.id
                  AND i_tag.name = ANY(%(tags)s)
            )
        """

    age_filter_sql = ""
    if query.min_age is not None:
        age_filter_sql += " AND age >= %(min_age)s"
    if query.max_age is not None:
        age_filter_sql += " AND age <= %(max_age)s"

    fame_filter_sql = ""
    if query.min_fame is not None:
        fame_filter_sql += " AND fame_rating >= %(min_fame)s"
    if query.max_fame is not None:
        fame_filter_sql += " AND fame_rating <= %(max_fame)s"

    distance_filter_sql = ""
    if query.max_distance_km is not None:
        distance_filter_sql = " AND distance_km <= %(max_distance_km)s"

    base_cte = f"""
        WITH candidates AS (
            SELECT
                u.id,
                u.username,
                u.first_name,
                u.last_name,
                u.bio,
                u.fame_rating,
                u.location_label,
                EXTRACT(YEAR FROM AGE(u.birthdate))::int AS age,
                (
                    SELECT COALESCE(array_agg(i.name ORDER BY i.name), ARRAY[]::varchar[])
                    FROM interests i
                    JOIN user_interests ui_viewer ON ui_viewer.interest_id = i.id
                    JOIN user_interests ui_candidate ON ui_candidate.interest_id = i.id
                    WHERE ui_viewer.user_id = %(viewer_id)s
                      AND ui_candidate.user_id = u.id
                ) AS common_interests,
                (
                    SELECT COUNT(DISTINCT i.id)
                    FROM interests i
                    JOIN user_interests ui_viewer ON ui_viewer.interest_id = i.id
                    JOIN user_interests ui_candidate ON ui_candidate.interest_id = i.id
                    WHERE ui_viewer.user_id = %(viewer_id)s
                      AND ui_candidate.user_id = u.id
                )::int AS common_interest_count,
                (
                    SELECT url FROM images
                    WHERE user_id = u.id AND is_profile_picture = true
                    LIMIT 1
                ) AS profile_picture_path,
                (
                    SELECT COALESCE(array_agg(i.name ORDER BY i.name), ARRAY[]::varchar[])
                    FROM interests i
                    JOIN user_interests ui ON ui.interest_id = i.id
                    WHERE ui.user_id = u.id
                ) AS interest_list,
                6371 * acos(
                    LEAST(1.0, GREATEST(-1.0,
                        cos(radians(%(viewer_lat)s)) * cos(radians(u.latitude)) *
                        cos(radians(u.longitude) - radians(%(viewer_lng)s)) +
                        sin(radians(%(viewer_lat)s)) * sin(radians(u.latitude))
                    ))
                ) AS distance_km
            FROM users u
            WHERE u.id != %(viewer_id)s
              AND u.is_profile_completed = true
              AND u.gender = %(viewer_preference)s
              AND u.sexual_preference = %(viewer_gender)s
              AND u.latitude IS NOT NULL
              AND u.longitude IS NOT NULL
              AND u.birthdate IS NOT NULL
              AND NOT EXISTS (
                  SELECT 1 FROM user_likes ul
                  WHERE ul.liker_id = %(viewer_id)s AND ul.liked_id = u.id
              )
              AND NOT EXISTS (
                  SELECT 1 FROM user_blocks ub
                  WHERE (ub.blocker_id = %(viewer_id)s AND ub.blocked_id = u.id)
                     OR (ub.blocker_id = u.id AND ub.blocked_id = %(viewer_id)s)
              )
              {tag_filter_sql}
        ),
        filtered AS (
            SELECT * FROM candidates
            WHERE 1=1
              {age_filter_sql}
              {fame_filter_sql}
              {distance_filter_sql}
        )
    """

    count_sql = base_cte + " SELECT COUNT(*) AS total FROM filtered"

    data_sql = (
        base_cte
        + f"""
        SELECT *
        FROM filtered
        ORDER BY {sort_column} {order_sql} NULLS LAST,
                 distance_km ASC NULLS LAST,
                 common_interest_count DESC,
                 fame_rating DESC
        LIMIT %(limit)s OFFSET %(offset)s
        """
    )

    return count_sql, data_sql, {"tags": tag_list}


def get_suggestions(
    current_user: dict[str, Any], query: SuggestionQuery
) -> SuggestionListResponse:
    with PgDatabase() as db:
        db.cursor.execute(
            """
            SELECT id, gender, sexual_preference, latitude, longitude,
                   is_profile_completed
            FROM users WHERE id = %s
            """,
            (current_user["user_id"],),
        )
        viewer = db.cursor.fetchone()

        if not viewer:
            raise HTTPException(status_code=404, detail="User not found")

        if not viewer["is_profile_completed"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Complete your profile before browsing suggestions",
            )

        if viewer["latitude"] is None or viewer["longitude"] is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Set your location before browsing suggestions",
            )

        params: dict[str, Any] = {
            "viewer_id": viewer["id"],
            "viewer_gender": viewer["gender"],
            "viewer_preference": viewer["sexual_preference"],
            "viewer_lat": float(viewer["latitude"]),
            "viewer_lng": float(viewer["longitude"]),
            "min_age": query.min_age,
            "max_age": query.max_age,
            "max_distance_km": query.max_distance_km,
            "min_fame": query.min_fame,
            "max_fame": query.max_fame,
            "limit": query.limit,
            "offset": query.offset,
        }

        count_sql, data_sql, extra = _build_suggestions_query(query)
        params.update(extra)

        db.cursor.execute(count_sql, params)
        total = db.cursor.fetchone()["total"]

        db.cursor.execute(data_sql, params)
        rows = db.cursor.fetchall()

    results = []
    for row in rows:
        interest_list = row.get("interest_list") or []
        common_interests = row.get("common_interests") or []
        profile_picture_path = row.get("profile_picture_path")

        results.append(
            SuggestedProfile(
                username=row["username"],
                first_name=row["first_name"],
                last_name=row["last_name"],
                age=int(row["age"]),
                bio=row.get("bio"),
                fame_rating=row.get("fame_rating") or 0,
                profile_picture=(
                    _image_public_url(profile_picture_path)
                    if profile_picture_path
                    else None
                ),
                interests=list(interest_list),
                common_interests=list(common_interests),
                common_interest_count=int(row.get("common_interest_count") or 0),
                distance_km=(
                    round(float(row["distance_km"]), 2)
                    if row.get("distance_km") is not None
                    else None
                ),
                location_label=row.get("location_label"),
            )
        )

    return SuggestionListResponse(
        results=results,
        total=total,
        limit=query.limit,
        offset=query.offset,
    )
