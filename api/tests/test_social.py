from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException

from src.services import social_service


def _patch_pg(mock_pg_cursor):
    _, _, db_ctx = mock_pg_cursor
    instance = MagicMock()
    instance.__enter__.return_value = db_ctx
    instance.__exit__.return_value = False
    return patch("src.services.social_service.PgDatabase", return_value=instance)


class TestFameRating:
    def test_recalculate_fame_rating_is_views_plus_likes(self, mock_pg_cursor):
        _, _, db_ctx = mock_pg_cursor
        db_ctx.cursor.fetchone.side_effect = [{"count": 4}, {"count": 2}]

        rating = social_service.recalculate_fame_rating(db_ctx, 1)

        assert rating == 6


class TestLikes:
    def test_like_user_requires_profile_picture(self, mock_pg_cursor):
        cursor, _, _ = mock_pg_cursor
        cursor.fetchone.return_value = None

        with _patch_pg(mock_pg_cursor):
            with pytest.raises(HTTPException) as exc:
                social_service.like_user(1, "otheruser")

        assert exc.value.status_code == 403

    def test_like_user_recalculates_fame(self, mock_pg_cursor):
        cursor, _, _ = mock_pg_cursor
        cursor.fetchone.side_effect = [
            {"id": 2},
            {"count": 1},
            {"count": 1},
            {"username": "liker"},
        ]

        with _patch_pg(mock_pg_cursor):
            with patch(
                "src.services.social_service.user_has_profile_picture",
                return_value=True,
            ):
                with patch(
                    "src.services.moderation_service.is_blocked",
                    return_value=False,
                ):
                    with patch(
                        "src.services.social_service.is_connected",
                        return_value=False,
                    ):
                        with patch(
                            "src.services.notification_service.create_and_push_notification"
                        ):
                            result = social_service.like_user(1, "otheruser")

        assert result["fame_rating"] == 2

    def test_is_connected_when_mutual_likes(self, mock_pg_cursor):
        cursor, _, _ = mock_pg_cursor
        cursor.fetchone.side_effect = [{"exists": True}, {"exists": True}]

        assert social_service.is_connected(cursor, 1, 2) is True


class TestViews:
    def test_record_profile_view_skips_self(self, mock_pg_cursor):
        cursor, _, _ = mock_pg_cursor

        with _patch_pg(mock_pg_cursor):
            social_service.record_profile_view(1, 1, db=MagicMock())

        cursor.execute.assert_not_called()

    def test_get_profile_viewers_returns_summaries(self, mock_pg_cursor):
        cursor, _, _ = mock_pg_cursor
        cursor.fetchall.return_value = [
            {
                "username": "viewer1",
                "first_name": "View",
                "last_name": "Er",
                "fame_rating": 1,
                "profile_picture": "pic.jpg",
                "viewed_at": "2026-01-01T00:00:00",
            }
        ]

        with _patch_pg(mock_pg_cursor):
            viewers = social_service.get_profile_viewers(1)

        assert viewers[0]["username"] == "viewer1"
        assert viewers[0]["profile_picture"].endswith("/api/images/pic.jpg")
