#!/bin/sh

   #******************************************
   # echo "# SteroidCyclePlotter" >> README.md
   git init
   git status
   git add .
   git commit -m "$(date "+%Y-%m-%d")"
   git branch -M main
   git remote add origin  git@github.com:Alex2269/SteroidCyclePlotter.git
   git push -u origin main
   git pull
   #******************************************
   rm -rf .git;
   git init ; git status ; git add . ; git commit -m "$(date "+%Y-%m-%d")" ; git branch -M main ;
   git remote add origin  git@github.com:Alex2269/SteroidCyclePlotter.git ;
   git push -u origin main ; git pull
   #******************************************
   видалення останніх комітів:
   # git reset HEAD^    --hard
   #
   git reset  origin    --hard
   git reset  HEAD~1    --hard
   git reset  HEAD~1    --hard
   git reset  HEAD~1    --hard
   git push origin HEAD --force
   #******************************************
   подивитись останні зміни:
   git log -p -1
   #******************************************
   оновлення та полсилання файлів на сховищє:
   #
   git status
   git add .
   git commit -m "$(date "+%Y-%m-%d")"
   git push -u origin main
   git pull
   #******************************************
   git status ; git add . ; git commit -m "$(date "+%Y-%m-%d")" ; git push -u origin main ;  git pull
