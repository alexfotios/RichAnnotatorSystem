# RichAnnotatorSystem
Rich Annotator System is implemented as a "code overlay" on ShareLatex's free and open source code.
It modifies sharelatex into an html2pdf online multi-user collaboration platform. The html2pdf engine is wkhtmltopdf

# Installation
Follow the sharelatex installation procedure as outlined here: https://github.com/sharelatex/sharelatex/wiki/Quick-Start-Guide
More specifically:
   0. sudo apt update
   1. sudo apt install docker.io
   2. sudo apt install docker-compose
   3. sudo apt-get install redis-server
   4. sudo apt-get install mongodb
   5. sudo docker pull sharelatex/sharelatex
   6. get latest docker-compose.yml from: https://github.com/sharelatex/sharelatex/blob/master/docker-compose.yml
   7. sudo docker-compose up (creates and starts the containers)
   8. After that to start the sharelatex docker, simply: sudo docker exec sharelatex
   9. To bash into the sharelatex docker: sudo docker exec -it sharelatex bash
   10. cd /var/www/sharelatex/web  
   11. git clone https://github.com/alexfotios/RichAnnotatorSys/var/www/sharelatex/webtem.git
   12. Manually replace homonymous files in the docker container filesystem with the ones in this repository
       Files that need replacing under docker dir /var/www/sharelatex/web are below.
       The list below may not be complete - make sure you overwrite all homonymous files in the repository.
       ./public/minjs/ide/file-tree/FileTreeManager.js
       ./app/js/Features/User/UserRegistrationHandler.js
       ./app/views/project/list/empty-project-list.pug
       ./app/views/layout.pug
       ./app/views/user/passwordReset.pug
       ./public/stylesheets/style.css
       ./app/js/Features/Project/ProjectCreationHandler.js
       ./app/views/user/activate.pug
       ./app/views/layout/footer.pug
       ./app/views/project/editor/left-menu.pug
       ./app/views/project/editor/pdf.pug
       ./app/views/user/setPassword.pug
       ./app/js/Features/Project/ProjectEntityUpdateHandler.js
       ./app/views/project/editor.pug
       ./app/views/project/editor/editor.pug
       ./app/views/project/list/modals.pug
       ./app/views/project/list/project-list.pug
       ./config/settings.defaults.coffee
       ./public/minjs/ide.js
       ./app/views/layout/navbar.pug
       ./app/views/user/register.pug
       ./app/views/admin/register.pug
       ./app/views/project/list/side-bar.pug
   13. Install Apache & PHP
         a. sudo apt install apache2
         b. sudo apt install php libapache2-mod-php
   14. Configure apache to run on a port other than 80 and open that port in the firewall
   15. Install wkhtmltopdf: sudo apt install wkhtmltopdf
   16. Install xvfb: sudo apt install xvfb
   17. Add html2pdf.php script to apache2 doc root
   18. Install MD2PDF lib (https://github.com/showdownjs/showdown) via CDN js script
         - https://rawgit.com/showdownjs/showdown/develop/dist/showdown.min.js
   19. Make sure docker does not go to sleep (set appropriate config options)
   20. Make sure docker auto-restarts on boot
   21. Restart server
   22. Clear your browser cache and visit http://rich.ppke.hu

# OS and other dependencies
1. It is strongly recommended that the Operating System of choice is Ubuntu 18.04 (bionic)
2. Other sharelatex codebase dependencies: https://gist.github.com/jbeyerstedt/25aa90cd9a8cfd7476618daca81c9c58
