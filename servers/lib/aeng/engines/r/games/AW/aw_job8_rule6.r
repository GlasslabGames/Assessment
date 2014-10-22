##Rule6
##This player correctly matched all of the reasoning wheel 
##sentences in the last case played.
##rsnwhl: 2 = attempt and correct; 1 = attempt and incorrect; 0 = no attempt
aw <- inData
r6set1 <- aw %>%
  group_by(sid) %>%
  select(sid, CaseOrder, rsnwhl) %>%
  filter(CaseOrder==max(CaseOrder))  
list(r6set1)


#str(aw)
#r3set2 <- aw %>%
#  group_by(sid) %>%
#  select(sid, CaseOrder, rsnwhl) %>%
#  filter(CaseOrder==max(CaseOrder)) %>%
#  summarise_each(funs(max), rsnwhl)
#r3set2 <- mutate(r3set2, rsnwhl1 = rsnwhl == 1)
#list(r3set2)

str(aw)
r6set2 <- aw %>%
  group_by(sid) %>%
  select(sid, CaseOrder, rsnwhl) %>%
  filter(rsnwhl < 2 & CaseOrder==max(CaseOrder)) %>%
  summarise_each(funs(max), rsnwhl)
r6set2 <- mutate(r6set2, rsnwhl1 = rsnwhl == 0)
list(r6set2)

r6set3 <- merge(r6set1, r6set2, by=c("sid"))
list(r6set3)
