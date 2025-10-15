@echo off
REM 🚀 Quick Deploy Script for LocalHands (Windows)
REM This script prepares your code for deployment

echo 🚀 LocalHands Deployment Preparation
echo ======================================
echo.

REM Check if git is initialized
if not exist ".git" (
    echo ⚠️  Git not initialized. Initializing...
    git init
    echo ✅ Git initialized
)

REM Check for uncommitted changes
git status --short > temp_status.txt
for /f %%i in ("temp_status.txt") do set size=%%~zi
if %size% gtr 0 (
    echo 📝 You have uncommitted changes:
    type temp_status.txt
    echo.
    set /p commit_choice="Do you want to commit these changes? (y/n): "
    if /i "%commit_choice%"=="y" (
        set /p commit_message="Enter commit message: "
        git add .
        git commit -m "%commit_message%"
        echo ✅ Changes committed
    )
) else (
    echo ✅ No uncommitted changes
)
del temp_status.txt

REM Check if remote is set
git remote get-url origin >nul 2>&1
if errorlevel 1 (
    echo ⚠️  No remote repository set
    set /p repo_url="Enter your GitHub repository URL: "
    git remote add origin %repo_url%
    echo ✅ Remote repository added
)

REM Push to GitHub
echo.
echo 🔄 Pushing to GitHub...
git push -u origin main

if %errorlevel% equ 0 (
    echo ✅ Successfully pushed to GitHub!
    echo.
    echo 🎉 Next steps:
    echo 1. Go to https://render.com
    echo 2. Sign in with GitHub
    echo 3. Click 'New +' → 'Blueprint'
    echo 4. Select your repository
    echo 5. Render will automatically deploy from render.yaml
    echo.
    echo 📖 For detailed instructions, see DEPLOYMENT_GUIDE.md
) else (
    echo ❌ Failed to push to GitHub
    echo Please check your git configuration and try again
)

pause
