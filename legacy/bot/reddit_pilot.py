import os
import praw
import time
import random
from dotenv import load_dotenv

# Load environment variables
load_dotenv('secrets.env')

class RedditPilot:
    def __init__(self, dry_run=True):
        self.dry_run = dry_run
        if not dry_run:
            self.reddit = praw.Reddit(
                client_id=os.getenv('REDDIT_CLIENT_ID'),
                client_secret=os.getenv('REDDIT_CLIENT_SECRET'),
                user_agent=os.getenv('REDDIT_USER_AGENT'),
                username=os.getenv('REDDIT_USERNAME'),
                password=os.getenv('REDDIT_PASSWORD')
            )
            print(f"[LOG] Authenticated as /u/{self.reddit.user.me()}")
        else:
            print("[DRY RUN] Mode Active - No real posts will be made.")

    def post_to_subreddit(self, subreddit_name, title, body):
        print(f"[ACTION] Preparing post for r/{subreddit_name}")
        print(f"[TITLE] {title}")
        
        if self.dry_run:
            print(f"[DRY RUN] Would have posted to r/{subreddit_name}")
            return

        try:
            subreddit = self.reddit.subreddit(subreddit_name)
            submission = subreddit.submit(title, selftext=body)
            print(f"[SUCCESS] Post live: {submission.url}")
            
            # Smart Delay to avoid bot detection (5-15 mins)
            delay = random.randint(300, 900)
            print(f"[WAIT] Sleeping for {delay}s...")
            time.sleep(delay)
            
        except Exception as e:
            print(f"[ERROR] Subreddit r/{subreddit_name} failed: {e}")

if __name__ == "__main__":
    # Example Usage for Day 2 Task
    pilot = RedditPilot(dry_run=True)
    
    # Day 2: Post to r/ethdev (Feedback Focused)
    dev_title = "Feedback on a crypto market monitoring dashboard + portfolio simulator preview?"
    dev_body = """
    I've been working on HELIX, a research dashboard for market context and risk monitoring.
    It uses public price APIs for live tiles and includes a demo-only portfolio simulator (no keys, no signing).

    Looking for feedback on clarity and UX labels. Not financial advice.

    Request access: helix.app
    """
    
    pilot.post_to_subreddit("ethdev", dev_title, dev_body)
