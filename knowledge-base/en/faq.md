# Frequently asked questions — branch closures

> Location-specific data (status, date, address, hours, distance) always comes from the
> tools. This file supplies the general answers.

---

## About your own branch

### Is my branch closing?
The agent asks for the municipality or postcode and calls `find_location`, then
`get_branch_status`. It never guesses. If the place is not unambiguous, it asks which one.

### When exactly does it close?
The date comes from `get_branch_status`. If the closure is near, the agent also states the
number of days remaining.

### Why our branch in particular?
The deciding factors are how much the location is used, how reachable the alternatives are,
and whether a partner can be found locally. The agent gives no detailed justification for
an individual site; it refers to these criteria and to the consultation with the
municipality.

### Where can I go instead?
`find_alternatives` returns the nearest access points with distance, travel time and
opening hours. If the caller needs a particular service — payments or cash, say — the
filter is applied.

---

## About the alternatives

### What can I do at a partner branch?
Send and collect letters and parcels, make payments, withdraw cash, buy stamps, receive
registered items. Specialist services such as philately or identity services are not
available; those need a larger branch.

### Are the opening hours worse?
Usually not — mostly they are longer. A partner branch inside a shop is often open from
seven to eight and all day Saturday, whereas the previous branch closed over lunch.

### What is a My Post 24 terminal?
A parcel terminal: drop off and collect, around the clock, seven days a week, including
public holidays. No payments, no cash, no advice.

### I can't reach any branch. What now?
The home service. The carrier accepts items at the front door, sells stamps and delivers
cash. For people with no access point within reasonable distance it is free.

### Is the new point wheelchair accessible?
The agent has no data on accessibility for individual locations. It says so plainly, gives
the address, and offers to pass the question to the branch — or points to the home service,
which makes the question moot.

---

## About shipments and mail

### My parcel went to the old branch. Where is it now?
After a closure, items are automatically redirected to the successor location. For a
specific shipment, tracking is responsible — the agent gives the collection point, not the
status of an individual item.

### Does my postal address change?
No. Delivery to your home address is unaffected by a branch conversion. Letterbox and
delivery times stay the same.

### Do I need a redirection order?
No, not because of a branch closure. A redirection order is only needed when you move.

### Can I still have parcels delivered at home?
Yes. Home delivery is unaffected by the branch changes. If you are out, you can set a drop-
off location, neighbour delivery or a different collection point in the Post App.

---

## Digital routes

### I don't have a smartphone. Is that still fine?
Yes. All basic services remain available at a counter — at a partner branch, a parcel
pickup point, or through the home service. Digital offerings are an addition, not a
condition.

### How do I buy stamps without a branch?
Online as a WebStamp to print yourself, as an SMS code to write by hand, in the Post App,
at any partner branch, or through the home service.

### How do I pay a bill?
At the counter of a partner branch, digitally via eBill and E-Finance, or through the home
service.

---

## Handling the conversation

### If the caller is angry
Take the concern seriously, do not justify, do not play it down. State the facts first,
then the concrete alternative with address and opening hours. Anyone wanting to give
political feedback is directed to the responsible office.

### If the location stays unclear
Ask for the postcode. It is less ambiguous than a place name and carries more reliably over
the phone.

### If the question has nothing to do with branches
Say briefly that the agent handles branch network questions, and offer a handover to a
person.
