from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta
from decimal import Decimal

PROFILE_COUNT = 500
SEED_USERNAME_PREFIX = "seeduser"
EVAL_SEED_PASSWORD = "SeedPassword123!"

FIRST_NAMES = [
    "Alex",
    "Jordan",
    "Taylor",
    "Morgan",
    "Casey",
    "Riley",
    "Avery",
    "Quinn",
    "Sage",
    "Rowan",
    "Camille",
    "Lucas",
    "Emma",
    "Noah",
    "Lina",
    "Hugo",
    "Zoe",
    "Leo",
    "Maya",
    "Ethan",
]

LAST_NAMES = [
    "Martin",
    "Bernard",
    "Dubois",
    "Thomas",
    "Robert",
    "Richard",
    "Petit",
    "Durand",
    "Leroy",
    "Moreau",
    "Simon",
    "Laurent",
    "Lefevre",
    "Michel",
    "Garcia",
    "David",
    "Bertrand",
    "Roux",
    "Vincent",
    "Fournier",
]

BIOS = [
    "Coffee lover exploring the city one café at a time.",
    "Always up for a hike and a good conversation afterward.",
    "Passionate about photography and spontaneous road trips.",
    "Foodie who believes the best plans start with great meals.",
    "Bookworm by night, curious explorer by day.",
    "Training for my next marathon and looking for a running buddy.",
    "Music festival regular with a soft spot for indie bands.",
    "Weekend chef experimenting with recipes from around the world.",
    "Art gallery hopper searching for inspiration everywhere.",
    "Tech enthusiast who still prefers handwritten notes.",
]

PARIS_NEIGHBORHOODS = [
    "Le Marais, Paris",
    "Montmartre, Paris",
    "Bastille, Paris",
    "Oberkampf, Paris",
    "Canal Saint-Martin, Paris",
    "Latin Quarter, Paris",
    "Belleville, Paris",
    "Nation, Paris",
    "République, Paris",
    "Saint-Germain, Paris",
]


@dataclass(frozen=True)
class SeedProfile:
    index: int
    username: str
    email: str
    first_name: str
    last_name: str
    gender: str
    sexual_preference: str
    birthdate: date
    bio: str
    latitude: Decimal
    longitude: Decimal
    location_label: str
    fame_rating: int
    interest_ids: tuple[int, ...]


def build_seed_username(index: int) -> str:
    if index < 1 or index > PROFILE_COUNT:
        raise ValueError(f"Seed index must be between 1 and {PROFILE_COUNT}")
    return f"{SEED_USERNAME_PREFIX}{index:03d}"


def build_seed_email(index: int) -> str:
    return f"{build_seed_username(index)}@matcha.local"


def _gender_pair(index: int) -> tuple[str, str]:
    if index % 2 == 0:
        return "Male", "Female"
    return "Female", "Male"


def _birthdate_for_index(index: int) -> date:
    age = 21 + (index % 25)
    return date.today().replace(year=date.today().year - age)


def _coordinates_for_index(index: int) -> tuple[Decimal, Decimal]:
    latitude = Decimal("48.8566") + Decimal((index % 100) - 50) / Decimal("1000")
    longitude = Decimal("2.3522") + Decimal((index % 73) - 36) / Decimal("1000")
    return latitude, longitude


def select_interest_ids(index: int, interest_ids: list[int]) -> tuple[int, ...]:
    if not interest_ids:
        raise ValueError("At least one interest id is required")

    count = 2 + (index % 4)
    selected: list[int] = []
    for offset in range(count):
        selected.append(interest_ids[(index + offset) % len(interest_ids)])
    return tuple(dict.fromkeys(selected))


def build_seed_profile(index: int, interest_ids: list[int]) -> SeedProfile:
    gender, sexual_preference = _gender_pair(index)
    latitude, longitude = _coordinates_for_index(index)

    return SeedProfile(
        index=index,
        username=build_seed_username(index),
        email=build_seed_email(index),
        first_name=FIRST_NAMES[index % len(FIRST_NAMES)],
        last_name=LAST_NAMES[index % len(LAST_NAMES)],
        gender=gender,
        sexual_preference=sexual_preference,
        birthdate=_birthdate_for_index(index),
        bio=BIOS[index % len(BIOS)],
        latitude=latitude,
        longitude=longitude,
        location_label=PARIS_NEIGHBORHOODS[index % len(PARIS_NEIGHBORHOODS)],
        fame_rating=index % 101,
        interest_ids=select_interest_ids(index, interest_ids),
    )


def build_seed_profiles(
    interest_ids: list[int],
    count: int = PROFILE_COUNT,
) -> list[SeedProfile]:
    return [build_seed_profile(index, interest_ids) for index in range(1, count + 1)]
