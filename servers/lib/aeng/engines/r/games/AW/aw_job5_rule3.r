##Rule3
##This player attempted but did not match the 
##reasoning wheel sentence correctly 
##at all during the last case played.
##rsnwhl = Reasoning Wheel Performance
aw <- inData

r3set1 <- aw %>%
  group_by(sid) %>%
  select(sid, aw$CaseOrder, rsnwhl) %>%
  filter(aw$CaseOrder==max(aw$CaseOrder))
##rsnwhl: 0 = missing; 1 = attempted but wrong; 2 = attempted and correct
#list(r3set1)

# str(aw)
r3set2 <- aw %>%
  group_by(sid) %>%
  select(sid, aw$CaseOrder, rsnwhl) %>%
  filter(aw$CaseOrder==max(aw$CaseOrder)) %>%
  summarise_each(funs(max), rsnwhl)

#r3set2 <- mutate(r3set2, rwhl1 = rsnwhl == 1);
#list(r3set2)

#r3set3 <- merge(r3set1, r3set2, by=c("sid"))
#list(r3set3)
