from datetime import date

import pytest

from src.seed.profile_data import (
    PROFILE_COUNT,
    build_seed_email,
    build_seed_profile,
    build_seed_profiles,
    build_seed_username,
    select_interest_ids,
)


def test_build_seed_username_is_zero_padded():
    assert build_seed_username(1) == "seeduser001"
    assert build_seed_username(500) == "seeduser500"


def test_build_seed_email_uses_matcha_local_domain():
    assert build_seed_email(42) == "seeduser042@matcha.local"


def test_build_seed_profile_has_valid_completion_fields():
    profile = build_seed_profile(1, [1, 2, 3, 4, 5])

    assert profile.gender == "Female"
    assert profile.sexual_preference == "Male"
    assert len(profile.bio) >= 10
    assert profile.latitude is not None
    assert profile.longitude is not None
    assert profile.location_label.endswith("Paris")
    assert 21 <= (date.today().year - profile.birthdate.year) <= 45
    assert len(profile.interest_ids) >= 2


def test_build_seed_profiles_creates_distinct_usernames():
    profiles = build_seed_profiles([1, 2, 3], count=10)
    usernames = [profile.username for profile in profiles]

    assert len(profiles) == 10
    assert len(set(usernames)) == 10


def test_select_interest_ids_requires_available_interests():
    with pytest.raises(ValueError, match="At least one interest id"):
        select_interest_ids(1, [])


def test_build_seed_profiles_default_count():
    profiles = build_seed_profiles([1, 2, 3])
    assert len(profiles) == PROFILE_COUNT


def test_gender_pairing_is_balanced():
    profiles = build_seed_profiles([1, 2, 3], count=100)
    male_to_female = sum(
        1 for profile in profiles if profile.gender == "Male" and profile.sexual_preference == "Female"
    )
    female_to_male = sum(
        1 for profile in profiles if profile.gender == "Female" and profile.sexual_preference == "Male"
    )

    assert male_to_female == 50
    assert female_to_male == 50
