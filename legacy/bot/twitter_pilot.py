import os
import tweepy
import time
import random
from dotenv import load_dotenv

# Load environment variables
load_dotenv('secrets.env')

class TwitterPilot:
    def __init__(self, dry_run=True):
        self.dry_run = dry_run
        if not dry_run:
            self.client = tweepy.Client(
                bearer_token=os.getenv('TWITTER_BEARER_TOKEN'),
                consumer_key=os.getenv('TWITTER_API_KEY'),
                consumer_secret=os.getenv('TWITTER_API_SECRET'),
                access_token=os.getenv('TWITTER_ACCESS_TOKEN'),
                access_token_secret=os.getenv('TWITTER_ACCESS_SECRET')
            )
            print("[LOG] Authenticated with Twitter API v2.")
        else:
            print("[DRY RUN] Mode Active - No real tweets will be sent.")

    def post_thread(self, tweets):
        """
        Posts a series of tweets as a thread.
        'tweets' should be a list of strings.
        """
        print(f"[ACTION] Preparing thread with {len(tweets)} tweets.")

        if self.dry_run:
            for i, tweet in enumerate(tweets):
                print(f"[DRY RUN] Tweet {i+1}: {tweet}")
            return

        last_tweet_id = None
        for i, tweet in enumerate(tweets):
            try:
                if i == 0:
                    response = self.client.create_tweet(text=tweet)
                else:
                    response = self.client.create_tweet(text=tweet, in_reply_to_tweet_id=last_tweet_id)

                last_tweet_id = response.data['id']
                print(f"[SUCCESS] Tweet {i+1} sent.")

                # Randomized delay between tweets in a thread (15-45s)
                time.sleep(random.randint(15, 45))

            except Exception as e:
                print(f"[ERROR] Failed to send tweet {i+1}: {e}")
                break

if __name__ == "__main__":
    # Example Usage for Day 3 Task
    pilot = TwitterPilot(dry_run=True)

    thread_content = [
        "1/4 Most crypto dashboards chase attention. HELIX focuses on calm market context.",
        "2/4 It surfaces bias and uncertainty labels for research use - not trade execution.",
        "3/4 The portfolio view is a simulator preview (no keys, no signing).",
        "4/4 Access is manual for now: helix.app"
    ]

    pilot.post_thread(thread_content)
