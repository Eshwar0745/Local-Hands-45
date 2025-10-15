#!/bin/bash

# 🚀 Quick Deploy Script for LocalHands
# This script prepares your code for deployment

echo "🚀 LocalHands Deployment Preparation"
echo "======================================"
echo ""

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "⚠️  Git not initialized. Initializing..."
    git init
    echo "✅ Git initialized"
fi

# Check for uncommitted changes
if [[ -n $(git status -s) ]]; then
    echo "📝 You have uncommitted changes:"
    git status -s
    echo ""
    read -p "Do you want to commit these changes? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -p "Enter commit message: " commit_message
        git add .
        git commit -m "$commit_message"
        echo "✅ Changes committed"
    fi
else
    echo "✅ No uncommitted changes"
fi

# Check if remote is set
if ! git remote get-url origin > /dev/null 2>&1; then
    echo "⚠️  No remote repository set"
    read -p "Enter your GitHub repository URL: " repo_url
    git remote add origin "$repo_url"
    echo "✅ Remote repository added"
fi

# Push to GitHub
echo ""
echo "🔄 Pushing to GitHub..."
git push -u origin main

if [ $? -eq 0 ]; then
    echo "✅ Successfully pushed to GitHub!"
    echo ""
    echo "🎉 Next steps:"
    echo "1. Go to https://render.com"
    echo "2. Sign in with GitHub"
    echo "3. Click 'New +' → 'Blueprint'"
    echo "4. Select your repository"
    echo "5. Render will automatically deploy from render.yaml"
    echo ""
    echo "📖 For detailed instructions, see DEPLOYMENT_GUIDE.md"
else
    echo "❌ Failed to push to GitHub"
    echo "Please check your git configuration and try again"
fi
