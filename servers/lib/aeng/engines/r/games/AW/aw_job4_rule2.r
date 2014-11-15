

## Rule2: Identifies players that did not choose relevant supreme court precedent or 
##constitutional support in the first three moves of the last case played
##CaseOrder==max within the gets you to the last case played when the script is run
## order<4 ensures you look over only the first three moves

#create new vectors to implemet Rule2
inData$status1 <- 0
inData$status2 <- NA
inData$rule2 <- NA
#str(inData)

for (i in min(inData$sid):max(inData$sid))
{
  ##Identify the first three cards played in the last case
  inData[inData$sid==i & inData$CaseOrder==max(inData[inData$sid==i,"CaseOrder"]) & 
    inData$order < 4 & length(inData[inData$sid==i,"slct_crd"]) >= 3,]["status1"] <- 1
  
  ##CaseOrder==max gets you to the most recent case
  ##Need to document the rest of this statement.
  inData[inData$sid==i,]["status2"]  <- as.numeric(sum(inData[inData$sid==i & 
    inData$CaseOrder==max(inData[inData$sid==i,"CaseOrder"]) & inData$order < 4,]
      ["score"]==3)==0)
}

##Identify cases that meet both sets of criteria specified 
inData$rule2 <- inData$status1*inData$status2
#list(inData)
