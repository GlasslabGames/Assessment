##Job1:  Pull in sample data from the desktop; The data has headers and we'll pull it in without any modification; check to be sure columns were brought in properly; and check the structure (str).


pkgLoad <- function(x)
{
    if (!require(x,character.only = TRUE))
    {
        install.packages(x,dep=TRUE,repos="http://cran.rstudio.com/");
        if(!require(x,character.only = TRUE)) {
            stop("Package not found");
        }
    }
}

suppressMessages(pkgLoad("dplyr"));
suppressMessages(pkgLoad("stats"));

inData <- read.csv(file('stdin'));
