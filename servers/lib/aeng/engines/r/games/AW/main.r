
source("./load.r")

source("./aw_job2_rescore.r")

#source("./aw_job3_rule1.r") # not working
#  ./aw_job3_rule1.r:13:3: unexpected '['
# 12:   inData$rule1[inData$sid==i & inData$CaseOrder==max(inData$CaseOrder[inData$sid==i]) ]
# 13:   [
source("./aw_job4_rule2.r") # works

source("./aw_job5_rule3.r") # not working
# Error in filter(`aw %>% group_by(sid) %>% select(sid, CaseOrder, rsnwhl)`,  : 
#   object 'CaseOrder' not found

# source("./aw_job6_rule4.r") # not working, "CaseOrder"
source("./aw_job7_rule5.r") # works
#source("./aw_job8_rule6.r") # not working, "CaseOrder"
source("./aw_job9_rule7.r") # works
#source("./aw_job10_rule8.r") # not working, "CaseOrder"
source("./aw_job11_rule9.r") # works
source("./aw_job12_rule10.r") # works

print(inData)
