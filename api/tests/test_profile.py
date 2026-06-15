from unittest.mock import MagicMock, patch

from src.schemas.user import Gender, UserPut, UserUpdate
from src.services import user_service


def _patch_pg(mock_pg_cursor):
    _, _, db_ctx = mock_pg_cursor
    instance = MagicMock()
    instance.__enter__.return_value = db_ctx
    instance.__exit__.return_value = False
    return patch("src.services.user_service.PgDatabase", return_value=instance)


COMPLETE_USER = {
    "id": 1,
    "email": "test@example.com",
    "username": "testuser",
    "first_name": "Test",
    "last_name": "User",
    "gender": "Male",
    "bio": "A long enough biography here.",
    "sexual_preference": "Female",
    "latitude": 48.8566,
    "longitude": 2.3522,
    "location_label": "Paris",
    "is_verified": True,
    "is_profile_completed": True,
    "fame_rating": 3,
}


class TestProfileCompletion:
    def test_check_profile_completion_requires_all_fields(self, mock_pg_cursor):
        _, _, db_ctx = mock_pg_cursor
        db_ctx.cursor.fetchone.side_effect = [{"count": 1}, {"count": 1}]

        result = user_service.check_profile_completion(
            db_ctx,
            1,
            {
                "gender": "Male",
                "sexual_preference": "Female",
                "bio": "Long enough bio",
                "latitude": 1.0,
                "longitude": 2.0,
            },
        )

        assert result is True

    def test_check_profile_completion_fails_without_images(self, mock_pg_cursor):
        _, _, db_ctx = mock_pg_cursor
        db_ctx.cursor.fetchone.side_effect = [{"count": 0}, {"count": 1}]

        result = user_service.check_profile_completion(
            db_ctx,
            1,
            {
                "gender": "Male",
                "sexual_preference": "Female",
                "bio": "Long enough bio",
                "latitude": 1.0,
                "longitude": 2.0,
            },
        )

        assert result is False


class TestPartialUpdateUser:
    def test_preserves_client_sexual_preference(self, mock_pg_cursor):
        cursor, _, _ = mock_pg_cursor

        def fetchone_side_effect():
            calls = [
                COMPLETE_USER,
                {"count": 1},
                {"count": 1},
                COMPLETE_USER,
                None,
                [],
                None,
                COMPLETE_USER,
            ]
            for value in calls:
                yield value

        cursor.fetchone.side_effect = list(fetchone_side_effect())
        cursor.fetchall.side_effect = [[], []]

        with _patch_pg(mock_pg_cursor):
            user_service.partial_update_user(
                "testuser",
                UserUpdate(sexual_preference=Gender.MALE),
                {"user_id": 1},
                MagicMock(),
            )

        update_sql = [
            call[0][0]
            for call in cursor.execute.call_args_list
            if "UPDATE users" in call[0][0]
        ][0]
        update_params = [
            call[0][1]
            for call in cursor.execute.call_args_list
            if "UPDATE users" in call[0][0]
        ][0]
        assert "sexual_preference" in update_sql
        assert Gender.MALE in update_params

    def test_unchanged_email_does_not_invalidate_verification(
        self, mock_pg_cursor
    ):
        cursor, _, _ = mock_pg_cursor
        cursor.fetchone.side_effect = [
            COMPLETE_USER,
            {"count": 1},
            {"count": 1},
            COMPLETE_USER,
            None,
            [],
            None,
            COMPLETE_USER,
        ]
        cursor.fetchall.side_effect = [[], []]
        background_tasks = MagicMock()

        with (
            _patch_pg(mock_pg_cursor),
            patch(
                "src.services.user_service._queue_email_verification_on_email_change"
            ) as queue_email,
        ):
            user_service.partial_update_user(
                "testuser",
                UserUpdate(
                    first_name="Updated",
                    email=COMPLETE_USER["email"],
                ),
                {"user_id": 1},
                background_tasks,
            )

        queue_email.assert_not_called()
        update_sql = [
            call[0][0]
            for call in cursor.execute.call_args_list
            if "UPDATE users" in call[0][0]
        ][0]
        assert "is_verified" not in update_sql
        assert "email" not in update_sql


class TestUpdateUser:
    def test_put_uses_correct_latitude_longitude_order(self, mock_pg_cursor):
        cursor, _, _ = mock_pg_cursor
        cursor.fetchone.side_effect = [
            {"id": 1, "email": "test@example.com", "username": "testuser", "is_verified": True},
            {"count": 1},
            {"count": 1},
            COMPLETE_USER,
            None,
            [],
            None,
        ]
        cursor.fetchall.return_value = []

        payload = UserPut(
            username="testuser",
            email="test@example.com",
            first_name="Test",
            last_name="User",
            gender=Gender.MALE,
            sexual_preference=Gender.FEMALE,
            bio="A long enough biography here.",
            latitude=48.8566,
            longitude=2.3522,
            images=["pic.jpg"],
        )

        with _patch_pg(mock_pg_cursor):
            user_service.update_user(
                "testuser",
                payload,
                {"user_id": 1},
                MagicMock(),
            )

        update_params = [
            call[0][1]
            for call in cursor.execute.call_args_list
            if "UPDATE users" in call[0][0]
        ][0]
        assert update_params[6] == 48.8566
        assert update_params[7] == 2.3522


class TestImageNormalization:
    def test_normalize_image_path_strips_api_prefix(self):
        assert user_service._normalize_image_path("/api/images/user/pic.jpg") == "user/pic.jpg"

    def test_image_public_url_adds_prefix(self):
        assert user_service._image_public_url("user/pic.jpg").endswith(
            "/api/images/user/pic.jpg"
        )
