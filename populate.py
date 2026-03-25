# easy way to load some folks onto the server for testing 

import psycopg2
import random

# Database connection
DB_CONFIG = {
    "dbname": "leaderboard",
    "user": "postgres",
    "password": "Turmoil4-Mouse8-Attic8-Shorthand4-Catsup8", 
    "host": "localhost",
    "port": "5432"
}

STUDENTS = [
    ("John", "Smith"), ("Jane", "Doe"), ("Aubie", "Tiger"), 
    ("Otto", "Priminger"), ("Bruce", "Wayne"), ("Clark", "Kent"), 
    ("Barbie", "Doll"), ("The", "Chosen"), ("Shayne", "Topp"), ("Bubba", "Gump")
]

GAMES = ["game1", "game2", "game3-1", "game3-2", "game3-3"]
SECTIONS = ["001", "002", "003"]

def populate():
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()
    
    try:
        # 1. Clear existing data to remove "Fake Users"
        cur.execute("TRUNCATE TABLE public.game_analytics CASCADE;")
        cur.execute("TRUNCATE TABLE public.player_profiles CASCADE;")
        
        print("Cleaning out old data...")

        for i, (first, last) in enumerate(STUDENTS):
            username = f"{(first[0] + last).lower()}{random.randint(10, 99)}"
            # Distribute students across sections 001, 002, 003
            section = SECTIONS[i % 3] 
            
            # Insert Profile
            cur.execute(
                "INSERT INTO public.player_profiles (username, first_name, last_name, section) VALUES (%s, %s, %s, %s)",
                (username, first, last, section)
            )

            # 2. Generate Scores (Constraints: 3-5 attempts per game per student)
            for game in GAMES:
                attempts = random.randint(3, 5)
                for _ in range(attempts):
                    score = random.randint(500, 2500)
                    time_played = random.randint(60, 300)
                    cur.execute(
                        "INSERT INTO public.game_analytics (game, username, score, time_played_seconds) VALUES (%s, %s, %s, %s)",
                        (game, username, score, time_played)
                    )
        
        conn.commit()
        print(f"Successfully added {len(STUDENTS)} students across {len(SECTIONS)} sections.")
    except Exception as e:
        print(f"Error: {e}")
        conn.rollback()
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    populate()