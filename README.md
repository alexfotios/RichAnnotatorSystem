# RichAnnotatorSystem
Rich Annotator System is implemented as a "code overlay" on ShareLatex's free and open source code.
It modifies sharelatex into an html2pdf online multi-user collaboration platform. The html2pdf engine is wkhtmltopdf

# Installation
1. Follow the sharelatex installation procedure as outlined here: https://github.com/sharelatex/sharelatex/wiki/Quick-Start-Guide
2. Manually replace homonymous files in the docker filesystem with the ones in this repository
3. Install wkhtmltopdf
4. Install Apache2 (with php enabled) and make html2pdf.php (in this repository) executable under server's doc root
5. Restart server

# OS and other dependencies
1. It is strongly recommended that the Operating System of choice is Ubuntu 18.04 (bionic)
2. Other sharelatex codebase dependencies: https://gist.github.com/jbeyerstedt/25aa90cd9a8cfd7476618daca81c9c58
