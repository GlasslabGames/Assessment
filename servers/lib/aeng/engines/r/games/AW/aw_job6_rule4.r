##Rule4
##The player has not reviewed any of the opponent's 
##cards in the last case played
## opprev = opponent review
## select max case
## look for sid's where max(opprev) == 1
## opprev = 0 when "NA"
## opprev = 1 when "no rev"


aw <- inData
r4set1 <- aw %>%
  group_by(sid) %>%
  select(sid, CaseOrder, opprev) %>%
  filter(CaseOrder==max(CaseOrder))  
##opprev: 0 = NA; 1 = rev
list(r4set1)

str(aw)
r4set2 <- aw %>%
  group_by(sid) %>%
  select(sid, CaseOrder, opprev) %>%
  filter(CaseOrder==max(CaseOrder)) %>%
  summarise_each(funs(max), opprev)
r4set2 <- mutate(r4set2, opprev1 = opprev == 1)
list(r4set2)

r4set3 <- merge(r4set1, r4set2, by=c("sid"))
list(r4set3)



