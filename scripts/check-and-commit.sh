#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Running TypeScript check...${NC}"

# Run TypeScript check
npm run typecheck

if [ $? -ne 0 ]; then
    echo -e "${RED}TypeScript errors found! Please fix them before committing.${NC}"
    exit 1
fi

echo -e "${GREEN}TypeScript check passed!${NC}"

# Run lint check
echo -e "${YELLOW}Running lint check...${NC}"
npm run lint

if [ $? -ne 0 ]; then
    echo -e "${RED}Lint errors found! Please fix them before committing.${NC}"
    exit 1
fi

echo -e "${GREEN}Lint check passed!${NC}"

# If all checks pass, add and commit
if [ "$#" -eq 0 ]; then
    echo -e "${RED}Please provide a commit message${NC}"
    echo "Usage: ./scripts/check-and-commit.sh \"Your commit message\""
    exit 1
fi

echo -e "${YELLOW}Adding files and committing...${NC}"
git add -A
git commit -m "$1"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}Commit successful!${NC}"
    echo -e "${YELLOW}Pushing to remote...${NC}"
    git push
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}Push successful!${NC}"
    else
        echo -e "${RED}Push failed!${NC}"
        exit 1
    fi
else
    echo -e "${RED}Commit failed!${NC}"
    exit 1
fi