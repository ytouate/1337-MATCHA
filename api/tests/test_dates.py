from datetime import datetime, timedelta
from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException

from src.services import date_service


def _patch_pg(mock_pg_cursor):
    _, _, db_ctx = mock_pg_cursor
    instance = MagicMock()
    instance.__enter__.return_value = db_ctx
    instance.__exit__.return_value = False
    return patch("src.services.date_service.PgDatabase", return_value=instance)


def _sample_row(**overrides):
    future = datetime.utcnow() + timedelta(days=1)
    row = {
        "id": 5,
        "proposer_id": 1,
        "invitee_id": 2,
        "status": "proposed",
        "scheduled_at": future,
        "location_label": "Cafe",
        "latitude": None,
        "longitude": None,
        "note": "See you there",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "responded_at": None,
        "proposer_username": "alice",
        "proposer_first_name": "Alice",
        "proposer_last_name": "A",
        "proposer_profile_picture": None,
        "invitee_username": "bob",
        "invitee_first_name": "Bob",
        "invitee_last_name": "B",
        "invitee_profile_picture": None,
    }
    row.update(overrides)
    return row


class TestCreateProposal:
    def test_create_requires_connection(self, mock_pg_cursor):
        cursor, _, _ = mock_pg_cursor
        cursor.fetchone.side_effect = [{"id": 2}, None]

        with _patch_pg(mock_pg_cursor):
            with patch("src.services.date_service.is_blocked", return_value=False):
                with patch("src.services.date_service.is_connected", return_value=False):
                    with pytest.raises(HTTPException) as exc:
                        date_service.create_proposal(
                            1,
                            "bob",
                            datetime.utcnow() + timedelta(days=1),
                        )

        assert exc.value.status_code == 403

    def test_create_rejects_past_datetime(self, mock_pg_cursor):
        cursor, _, _ = mock_pg_cursor
        cursor.fetchone.return_value = {"id": 2}

        with _patch_pg(mock_pg_cursor):
            with patch("src.services.date_service.is_blocked", return_value=False):
                with patch("src.services.date_service.is_connected", return_value=True):
                    with pytest.raises(HTTPException) as exc:
                        date_service.create_proposal(
                            1,
                            "bob",
                            datetime.utcnow() - timedelta(hours=1),
                        )

        assert exc.value.status_code == 400

    def test_create_notifies_invitee(self, mock_pg_cursor):
        cursor, _, _ = mock_pg_cursor
        future = datetime.utcnow() + timedelta(days=1)
        row = _sample_row(scheduled_at=future)
        cursor.fetchone.side_effect = [
            {"id": 2},
            None,
            {"id": 5},
            row,
        ]

        with _patch_pg(mock_pg_cursor):
            with patch("src.services.date_service.is_blocked", return_value=False):
                with patch("src.services.date_service.is_connected", return_value=True):
                    with patch(
                        "src.services.notification_service.create_and_push_notification"
                    ) as mock_notify:
                        result = date_service.create_proposal(1, "bob", future)

        mock_notify.assert_called_once()
        assert mock_notify.call_args[0][2] == "date_proposed"
        assert result["status"] == "proposed"
        assert result["peer"]["username"] == "bob"

    def test_create_rejects_duplicate_pending(self, mock_pg_cursor):
        cursor, _, _ = mock_pg_cursor
        future = datetime.utcnow() + timedelta(days=1)
        cursor.fetchone.side_effect = [{"id": 2}, {"?": 1}]

        with _patch_pg(mock_pg_cursor):
            with patch("src.services.date_service.is_blocked", return_value=False):
                with patch("src.services.date_service.is_connected", return_value=True):
                    with pytest.raises(HTTPException) as exc:
                        date_service.create_proposal(1, "bob", future)

        assert exc.value.status_code == 409


class TestAcceptDeclineCancel:
    def test_only_invitee_can_accept(self, mock_pg_cursor):
        cursor, _, _ = mock_pg_cursor
        cursor.fetchone.return_value = _sample_row()

        with _patch_pg(mock_pg_cursor):
            with pytest.raises(HTTPException) as exc:
                date_service.accept_date(1, 5)

        assert exc.value.status_code == 403

    def test_invitee_accepts_and_notifies(self, mock_pg_cursor):
        cursor, _, _ = mock_pg_cursor
        proposed = _sample_row(status="proposed")
        accepted = _sample_row(status="accepted", responded_at=datetime.utcnow())
        cursor.fetchone.side_effect = [proposed, accepted]

        with _patch_pg(mock_pg_cursor):
            with patch(
                "src.services.notification_service.create_and_push_notification"
            ) as mock_notify:
                result = date_service.accept_date(2, 5)

        mock_notify.assert_called_once()
        assert mock_notify.call_args[0][2] == "date_accepted"
        assert result["status"] == "accepted"

    def test_invitee_declines_and_notifies(self, mock_pg_cursor):
        cursor, _, _ = mock_pg_cursor
        proposed = _sample_row(status="proposed")
        declined = _sample_row(status="declined", responded_at=datetime.utcnow())
        cursor.fetchone.side_effect = [proposed, declined]

        with _patch_pg(mock_pg_cursor):
            with patch(
                "src.services.notification_service.create_and_push_notification"
            ) as mock_notify:
                result = date_service.decline_date(2, 5)

        mock_notify.assert_called_once()
        assert mock_notify.call_args[0][2] == "date_declined"
        assert result["status"] == "declined"

    def test_participant_can_cancel(self, mock_pg_cursor):
        cursor, _, _ = mock_pg_cursor
        accepted = _sample_row(status="accepted")
        cancelled = _sample_row(status="cancelled")
        cursor.fetchone.side_effect = [accepted, cancelled]

        with _patch_pg(mock_pg_cursor):
            with patch(
                "src.services.notification_service.create_and_push_notification"
            ) as mock_notify:
                result = date_service.cancel_date(1, 5)

        mock_notify.assert_called_once()
        assert mock_notify.call_args[0][2] == "date_cancelled"
        assert result["status"] == "cancelled"

    def test_create_blocked_pair_rejected(self, mock_pg_cursor):
        cursor, _, _ = mock_pg_cursor
        cursor.fetchone.return_value = {"id": 2}

        with _patch_pg(mock_pg_cursor):
            with patch("src.services.date_service.is_blocked", return_value=True):
                with pytest.raises(HTTPException) as exc:
                    date_service.create_proposal(
                        1,
                        "bob",
                        datetime.utcnow() + timedelta(days=1),
                    )

        assert exc.value.status_code == 403
