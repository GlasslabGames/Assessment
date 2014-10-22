##Rule8
##This player chose Supreme Court precendent or Constitutional support 
##at least two times within the first four moves of the last case played, 
##and chose no irrelevant support during the game.
##max(CaseOrder)
##order<=4
##score == 3 two times or more
##score is never < 2

aw <- inData
r8set1 <- aw %>%
  group_by(sid) %>%
  select(sid, CaseOrder, order, score) %>%
  filter(order <= 4 & CaseOrder==max(CaseOrder))  
list(r8set1)

str(aw)
r8set2 <- aw %>%
  group_by(sid) %>%
  select(sid, CaseOrder, score) %>%
  filter(CaseOrder==max(CaseOrder)) %>%
  ##count(score == 3)
  ##summarise_each(funs(max), rsnwhl)
r8set2 <- mutate(r8set2, score1 = count(score == 3))
list(r8set2)

r8set3 <- aw %>%
  group_by(sid) %>%
  select(sid, CaseOrder, order, score) %>%
  filter(score > 1 & CaseOrder==max(CaseOrder))  
list(r8set3)
  
##summarise_each(funs(max), rsnwhl)
r8set2 <- mutate(r8set2, score1 = count(score == 3))
list(r8set2)


r8set4 <- merge(r8set1, r8set2,r8set3, by=c("sid"))
list(r8set3)
