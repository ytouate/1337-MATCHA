from src.db.helper import DatabaseHelper

interests = [
    "Reading",
    "Traveling",
    "Photography",
    "Cooking",
    "Music",
    "Sports",
    "Gaming",
    "Art",
    "Movies",
    "Technology",
    "Fitness",
    "Dancing",
    "Writing",
    "Hiking",
    "Fashion",
    "Food",
    "Animals",
    "Nature",
    "Science",
    "Languages",
]

if __name__ == "__main__":
    for interest in interests:
        DatabaseHelper.create_row("interests", {"name": interest})
