import os
import re
from functools import lru_cache

PASSWORD_MIN_LENGTH = 8
PASSWORD_MAX_LENGTH = 32
SPECIAL_CHARS = r'[!@#$%^&*(),.?":{}|<>]'


@lru_cache(maxsize=1)
def load_dictionary() -> frozenset[str]:
    path = os.path.join(os.path.dirname(__file__), "common_passwords.txt")
    with open(path) as file:
        return frozenset(line.strip().lower() for line in file if line.strip())


def contains_dictionary_word(password: str) -> bool:
    dictionary = load_dictionary()
    lowered = password.lower()
    if lowered in dictionary:
        return True
    tokens = re.findall(r"[a-zA-Z]+", password)
    return any(token.lower() in dictionary for token in tokens)


def validate_password(password: str) -> None:
    if len(password) < PASSWORD_MIN_LENGTH:
        raise ValueError(
            f"Password must be at least {PASSWORD_MIN_LENGTH} characters long"
        )
    if len(password) > PASSWORD_MAX_LENGTH:
        raise ValueError(f"Password must not exceed {PASSWORD_MAX_LENGTH} characters")
    if not re.search(r"[A-Z]", password):
        raise ValueError("Password must include at least one uppercase letter")
    if not re.search(r"[a-z]", password):
        raise ValueError("Password must include at least one lowercase letter")
    if not re.search(r"\d", password):
        raise ValueError("Password must include at least one number")
    if not re.search(SPECIAL_CHARS, password):
        raise ValueError("Password must include at least one special character")
    if contains_dictionary_word(password):
        raise ValueError("Password contains a common dictionary word")
