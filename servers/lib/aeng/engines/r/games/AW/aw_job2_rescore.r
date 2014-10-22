#Job2 Recoding slct_crd to values specified in the scoring rules.
#Creating a variable/vector to hold the recoded values of the slct_card variable
inData$score <- NA
list(inData$score)
##Recode the Evidence Card ID’s for the selected cards to reflect the scoring rules for each case  
inData$score[which(inData$slct_crd == "PS05" & inData$case == "nj")] <- 2
inData$score[which(inData$slct_crd == "PS07" & inData$case == "nj")] <- 0
inData$score[which(inData$slct_crd == "PS08" & inData$case == "nj")] <- 0
##etc.


inData$score[which(inData$slct_crd == "PS01" &inData$case == "bnd")] <- 3
inData$score[which(inData$slct_crd == "PS03" &inData$case == "bnd")] <- 2
inData$score[which(inData$slct_crd == "PS04" &inData$case == "bnd")] <- 3
inData$score[which(inData$slct_crd == "PS05" &inData$case == "bnd")] <- 2
inData$score[which(inData$slct_crd == "PS11" &inData$case == "bnd")] <- 2
inData$score[which(inData$slct_crd == "PS06" &inData$case == "bnd")] <- 2
#etc

inData$score[which(inData$slct_crd == "PS03" &inData$case == "mrn")] <- 2
inData$score[which(inData$slct_crd == "PS10" &inData$case == "mrn")] <- 1
inData$score[which(inData$slct_crd == "PS11" &inData$case == "mrn")] <- 1

list(inData$score)
