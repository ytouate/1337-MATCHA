import re

def is_empty(element) -> bool:
    return bool(len(element))


def check_injection(element) -> bool:
    no_white_space = "".join(element.split())
    return no_white_space.isalpha()

def str_validate(element: str, regex) -> bool:
    return re.search(regex, element)