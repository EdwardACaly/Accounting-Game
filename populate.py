import psycopg2
import random
import string

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
    ("Barbie", "Doll"), ("The", "Chosen"), ("Shayne", "Topp"), 
    ("Bubba", "Gump"), ("Princess", "Buttercup"), ("Indiana", "Jones")
]

GAMES = ["game1", "game2", "game3-1", "game3-2", "game3-3"]
SECTIONS = ["001", "002", "003"]

def generate_username(first, last):
    """
    Format: 1st initial + random letter + 1st initial of last name + 0 + 3 random numbers
    Example: John Smith -> js0123 (with a random letter in the 2nd slot)
    """
    f_init = first[0].lower()
    rand_char = random.choice(string.ascii_lowercase)
    l_init = last[0].lower()
    rand_nums = random.randint(100, 999)
    return f"{f_init}{rand_char}{l_init}0{rand_nums}"

def populate():
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()
    
    try:
        # 1. Clear existing data
        cur.execute("TRUNCATE TABLE public.game_analytics CASCADE;")
        cur.execute("TRUNCATE TABLE public.player_profiles CASCADE;")
        
        print("Cleaning out old data and populating new roster...")

        for i, (first, last) in enumerate(STUDENTS):
            # Apply your new username logic
            username = generate_username(first, last)
            
            # Distribute students across sections
            section = SECTIONS[i % 3] 
            
            # Insert Profile
            cur.execute(
                "INSERT INTO public.player_profiles (username, first_name, last_name, section) VALUES (%s, %s, %s, %s)",
                (username, first, last, section)
            )

            # 2. Generate Scores
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
        print(f"Sample Username Created: {generate_username('John', 'Smith')}")
        
    except Exception as e:
        print(f"Error: {e}")
        conn.rollback()
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    populate()