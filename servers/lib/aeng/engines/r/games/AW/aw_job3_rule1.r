list(inData$score)
#JOB3 APPLY RULE1
#First create vector for Rule1
inData$rule1 <- 0

## Apply the scoring rule for rule1:
## These players have chosen irrelevant support for their side of 
## the case at least two times during the last case played; 
## i.e. the slct_crd score was less than or equal to 2.
for (i in min(inData$sid):max(inData$sid))
{
  inData$rule1[inData$sid==i & inData$CaseOrder==max(inData$CaseOrder[inData$sid==i]) ]
  [ which( sum( inData$score[ inData$sid==i & inData$CaseOrder==max(inData$CaseOrder[inData$sid==i]) ] <=2 ) >=2 ) ] <- 1
}

## Results of Rule 1 should have been pushed into a new column "rule1"
#str(inData)

