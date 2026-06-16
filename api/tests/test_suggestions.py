from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException

from src.schemas.suggestion import SortBy, SuggestionQuery
from src.services import suggestion_service
from src.services.location_utils import (
    MAP_FUZZ_MAX_METERS,
    fuzz_map_coordinates,
    haversine_distance_meters,
)


def _patch_pg(mock_pg_cursor):
    _, _, db_ctx = mock_pg_cursor
    instance = MagicMock()
    instance.__enter__.return_value = db_ctx
    instance.__exit__.return_value = False
    return patch("src.services.suggestion_service.PgDatabase", return_value=instance)


COMPLETE_VIEWER = {
    "id": 1,
    "gender": "Male",
    "sexual_preference": "Female",
    "latitude": 33.5731,
    "longitude": -7.5898,
    "is_profile_completed": True,
}

CANDIDATE_ROW = {
    "id": 2,
    "username": "alice",
    "first_name": "Alice",
    "last_name": "Smith",
    "bio": "Hello there",
    "fame_rating": 5,
    "location_label": "Casablanca",
    "latitude": 33.58,
    "longitude": -7.59,
    "age": 25,
    "interest_list": ["Travel", "Cooking"],
    "common_interests": ["Travel"],
    "common_interest_count": 1,
    "profile_picture_path": "alice@example.com/pic.png",
    "distance_km": 12.5,
}


class TestFuzzMapCoordinates:
    def test_fuzz_is_deterministic_for_same_user(self):
        first = fuzz_map_coordinates(42, 48.8566, 2.3522)
        second = fuzz_map_coordinates(42, 48.8566, 2.3522)
        assert first == second

    def test_fuzz_offset_stays_within_expected_radius(self):
        latitude = 48.8566
        longitude = 2.3522
        map_lat, map_lng = fuzz_map_coordinates(7, latitude, longitude)
        distance = haversine_distance_meters(latitude, longitude, map_lat, map_lng)

        assert MAP_FUZZ_MAX_METERS >= distance >= 300


class TestGetSuggestions:
    def test_requires_completed_profile(self, mock_pg_cursor):
        cursor, _, _ = mock_pg_cursor
        cursor.fetchone.return_value = {
            **COMPLETE_VIEWER,
            "is_profile_completed": False,
        }

        with _patch_pg(mock_pg_cursor):
            with pytest.raises(HTTPException) as exc:
                suggestion_service.get_suggestions(
                    {"user_id": 1},
                    SuggestionQuery(),
                )

        assert exc.value.status_code == 403

    def test_requires_viewer_location(self, mock_pg_cursor):
        cursor, _, _ = mock_pg_cursor
        cursor.fetchone.return_value = {
            **COMPLETE_VIEWER,
            "latitude": None,
            "longitude": None,
        }

        with _patch_pg(mock_pg_cursor):
            with pytest.raises(HTTPException) as exc:
                suggestion_service.get_suggestions(
                    {"user_id": 1},
                    SuggestionQuery(),
                )

        assert exc.value.status_code == 403

    def test_returns_suggestions(self, mock_pg_cursor):
        cursor, _, _ = mock_pg_cursor
        cursor.fetchone.side_effect = [
            COMPLETE_VIEWER,
            {"total": 1},
        ]
        cursor.fetchall.return_value = [CANDIDATE_ROW]

        with _patch_pg(mock_pg_cursor):
            response = suggestion_service.get_suggestions(
                {"user_id": 1},
                SuggestionQuery(sort_by=SortBy.DISTANCE),
            )

        assert response.total == 1
        assert len(response.results) == 1
        assert response.results[0].username == "alice"
        assert response.results[0].common_interest_count == 1
        assert response.results[0].distance_km == 12.5
        assert "/api/images/" in response.results[0].profile_picture
        assert response.viewer_latitude == COMPLETE_VIEWER["latitude"]
        assert response.viewer_longitude == COMPLETE_VIEWER["longitude"]
        assert response.results[0].map_latitude is not None
        assert response.results[0].map_longitude is not None
        assert (
            response.results[0].map_latitude,
            response.results[0].map_longitude,
        ) != (CANDIDATE_ROW["latitude"], CANDIDATE_ROW["longitude"])

    def test_executes_count_and_data_queries_with_fame_filters(self, mock_pg_cursor):
        cursor, _, _ = mock_pg_cursor
        cursor.fetchone.side_effect = [
            COMPLETE_VIEWER,
            {"total": 0},
        ]
        cursor.fetchall.return_value = []

        with _patch_pg(mock_pg_cursor):
            suggestion_service.get_suggestions(
                {"user_id": 1},
                SuggestionQuery(min_fame=1, max_fame=10),
            )

        executed_sql = [call.args[0] for call in cursor.execute.call_args_list]
        assert len(executed_sql) == 3

        for sql in executed_sql[1:]:
            filtered_section = sql.split("filtered AS (")[1].split(")\n    ")[0]
            assert "fame_rating >= %(min_fame)s" in filtered_section
            assert "fame_rating <= %(max_fame)s" in filtered_section
            assert "u.fame_rating" not in filtered_section


class TestBuildSuggestionsQuery:
    def test_default_sort_is_distance_asc(self):
        _, data_sql, _ = suggestion_service._build_suggestions_query(SuggestionQuery())
        assert "ORDER BY distance_km ASC" in data_sql

    def test_tag_filter_included_when_tags_set(self):
        _, data_sql, params = suggestion_service._build_suggestions_query(
            SuggestionQuery(tags="Travel,Cooking")
        )
        assert "i_tag.name = ANY(%(tags)s)" in data_sql
        assert params["tags"] == ["Travel", "Cooking"]

    def test_age_and_fame_filters_included(self):
        count_sql, data_sql, _ = suggestion_service._build_suggestions_query(
            SuggestionQuery(min_age=21, max_age=35, min_fame=1, max_fame=10)
        )
        filtered_section = count_sql.split("filtered AS (")[1].split(")\n    ")[0]

        assert "age >= %(min_age)s" in filtered_section
        assert "age <= %(max_age)s" in filtered_section
        assert "fame_rating >= %(min_fame)s" in filtered_section
        assert "fame_rating <= %(max_fame)s" in filtered_section
        assert "u.fame_rating" not in filtered_section

        assert "ORDER BY" in data_sql

    def test_max_distance_filter_included(self):
        _, data_sql, _ = suggestion_service._build_suggestions_query(
            SuggestionQuery(max_distance_km=50)
        )
        assert "distance_km <= %(max_distance_km)s" in data_sql

    def test_mutual_preference_in_base_query(self):
        _, data_sql, _ = suggestion_service._build_suggestions_query(SuggestionQuery())
        assert "u.gender = %(viewer_preference)s" in data_sql
        assert "u.sexual_preference = %(viewer_gender)s" in data_sql

    def test_blocked_users_excluded(self):
        _, data_sql, _ = suggestion_service._build_suggestions_query(SuggestionQuery())
        assert "user_blocks" in data_sql

    def test_combined_filters_in_filtered_cte(self):
        count_sql, _, params = suggestion_service._build_suggestions_query(
            SuggestionQuery(
                min_age=22,
                max_age=40,
                min_fame=2,
                max_fame=20,
                max_distance_km=75,
                tags="Travel,Cooking",
            )
        )
        filtered_section = count_sql.split("filtered AS (")[1].split(")\n    ")[0]

        assert "age >= %(min_age)s" in filtered_section
        assert "age <= %(max_age)s" in filtered_section
        assert "fame_rating >= %(min_fame)s" in filtered_section
        assert "fame_rating <= %(max_fame)s" in filtered_section
        assert "distance_km <= %(max_distance_km)s" in filtered_section
        assert "u.fame_rating" not in filtered_section
        assert params["tags"] == ["Travel", "Cooking"]

    @pytest.mark.parametrize(
        ("sort_by", "column"),
        [
            (SortBy.DISTANCE, "distance_km"),
            (SortBy.AGE, "age"),
            (SortBy.FAME, "fame_rating"),
            (SortBy.COMMON_TAGS, "common_interest_count"),
        ],
    )
    def test_sort_options(self, sort_by, column):
        _, data_sql, _ = suggestion_service._build_suggestions_query(
            SuggestionQuery(sort_by=sort_by)
        )
        assert f"ORDER BY {column}" in data_sql

    def test_pagination_limit_offset_in_data_query(self):
        _, data_sql, _ = suggestion_service._build_suggestions_query(
            SuggestionQuery(limit=10, offset=30)
        )
        assert "LIMIT %(limit)s OFFSET %(offset)s" in data_sql

    def test_pagination_params_passed_to_execute(self, mock_pg_cursor):
        cursor, _, _ = mock_pg_cursor
        cursor.fetchone.side_effect = [COMPLETE_VIEWER, {"total": 0}]
        cursor.fetchall.return_value = []

        with _patch_pg(mock_pg_cursor):
            suggestion_service.get_suggestions(
                {"user_id": 1},
                SuggestionQuery(limit=10, offset=20),
            )

        data_params = cursor.execute.call_args_list[2].args[1]
        assert data_params["limit"] == 10
        assert data_params["offset"] == 20
