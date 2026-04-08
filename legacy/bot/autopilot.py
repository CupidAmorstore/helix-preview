import sys
import os
import time
import schedule
from reddit_pilot import RedditPilot
from twitter_pilot import TwitterPilot

def run_day_2_routine():
    print("\n[MISSION] Starting Day 2: Reddit Feedback and Product Clarity")

    # Init Pilots (Set dry_run=False once API keys are in secrets.env)
    # Check if .env is still template
    with open('secrets.env', 'r') as f:
        if 'your_client_id_here' in f.read():
            print("[WARNING] You are using the template secrets.env. No real posts will be made.")
            dry_run = True
        else:
            dry_run = False

    reddit = RedditPilot(dry_run=dry_run)
    twitter = TwitterPilot(dry_run=dry_run)

    # 1. Post to r/ethdev (Technical Feedback)
    reddit.post_to_subreddit(
        "ethdev",
        "Built a crypto market monitoring dashboard with a portfolio simulator preview - feedback on clarity?",
        "HELIX aggregates market context and risk signals for research use. "
        "The portfolio view is a demo-only simulator (no keys, no signing). "
        "Looking for feedback on labels and UX clarity. Not financial advice."
    )

    # 2. X (Twitter) Engagement (Thread)
    twitter.post_thread([
        "We built HELIX to reduce crypto dashboard noise, not to push trades.",
        "It highlights market context and uncertainty zones while keeping a demo-only portfolio simulator separate.",
        "Access is manual for now. Request at helix.app. Research only - not financial advice."
    ])

def main():
    print("--- HELIX Social Pilot: Autopilot Ready ---")
    print("Commands:")
    print("  1: Run Day 2 Routine NOW")
    print("  Q: Quit")

    choice = input("\nSelect an option: ")

    if choice == '1':
        run_day_2_routine()
    elif choice.lower() == 'q':
        sys.exit()
    else:
        print("Invalid choice.")

if __name__ == "__main__":
    main()
