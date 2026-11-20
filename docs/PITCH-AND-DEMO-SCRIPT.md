# Q-not — 3-minute pitch and live demo script

## 3-minute pitch

### 0:00–0:25 — Open with a real passenger decision

“Imagine you're leaving work in Enugu and want the affordable bus to Nsukka. You know the fare is good, but you don't know if the bus is ready, how many people are ahead of you or whether the queue will cost you another hour. So you travel to the park just to find out. Q-not changes that decision before you leave home.”

### 0:25–0:50 — Prove the problem is documented

“This isn't a made-up inconvenience. A study at Old Park, Enugu, published in the Nigerian Journal of Technology, found that 80 to 90 percent of surveyed passengers experienced waits of 21 minutes to an hour or more. The same share overestimated their waiting time by 25 to 60 percent. It included the Enugu–Nsukka route. Q-not starts with that exact corridor.”

### 0:50–1:20 — Explain the product

“Q-not shows departures, fares, seats available, people ahead and an estimated wait. The passenger compares the affordable bus with the next departure, then decides whether to leave now, wait or choose another operator. The app is not just selling a ticket. It is giving people the information to make a better travel decision.”

### 1:20–1:50 — Explain payment-backed commitment

“When a passenger wants a place, payment commitment holds the seat. If they cancel within the rules, the hold is released and the place can go to the next waitlisted passenger. The fare is settled when boarding is confirmed. The waitlist itself is free and does not consume seats.”

### 1:50–2:15 — Explain the real-world boarding gap

“Not every passenger will book through an app. Q-not therefore reconciles three signals: QR bookings, tap-to-pay walk-ins, and anonymous onboard door counts, with driver confirmation for exceptions. We want operators to see who is expected, who actually boarded and how many people are on the bus.”

### 2:15–2:40 — Extend the journey beyond the terminal

“Passengers can follow the vehicle, choose an approved pickup or drop-off point along the route and receive an arrival update. The longer-term opportunity is segment-level capacity: when someone alights at Opi, that seat can become available for the next passenger travelling to Nsukka.”

### 2:40–3:00 — Hisa and the ask

“We see a potential conversation with Hisa around the financial layer: wallet-funded fare holds, release/refund and operator settlement, if a suitable partner API and regulated structure are available. No integration is claimed today. We are looking for an operator pilot on Enugu–Nsukka, a financial-infrastructure conversation and permission to validate onboard counting. Q-not: know before you go.”

## Live demo order (about 90 seconds)

1. Open `/` and point out the animated Q-not bus, the departure finder and the prominent journey demo CTA.
2. Click **Watch the journey / Try the demo** (the label may vary by the final UI). Start on **Check before leaving**.
3. Show Enugu → Nsukka sample departures. Compare fare, seats open and waitlist count. Change pickup/drop-off between Peter Mbah Terminal, Opi Junction, UNN Gate and Nsukka Main Park.
4. Open **Hold your place**. Use the simulated Q-not wallet balance to place the ₦2,500 hold. Say explicitly: “This is a simulation; no real money moves.”
5. Release the hold. Show that the demo balance is restored and the place becomes available. Offer it to the waitlist and accept the simulated replacement.
6. Hold again and confirm boarding. Explain that the demo marks the fare as settled after the boarding event.
7. In **Board & travel**, record a walk-in tap. Show occupancy increase even though that passenger did not reserve in the app. Record a camera exit and show capacity returning for the next route segment.
8. Advance the bus progress to the selected stop. Close on the operator/driver experience if time allows.

## If the interactive walkthrough fails

- Do not spend the pitch debugging in front of judges.
- Return to the departure board and explain the five states verbally: browse → paid hold → waitlist/release → boarding settlement → onboard reconciliation.
- Use the current homepage screenshot and explain which states are simulated.
- Do not claim that Hisa, a camera, an NFC reader, live GPS or live operator feeds are connected.

## Five judge questions to prepare for

**1. Is Hisa integrated?**

“No. Hisa is a proposed financial ecosystem conversation. Its public product describes investing and wallet features; we have not confirmed a merchant or escrow API. The prototype labels it as a concept only. We want to ask whether their partner ecosystem can support a compliant conditional-fare flow.”

**2. How does the seat hold work?**

“An available seat is held only after payment commitment. For cards, that depends on provider-supported pre-authorisation and capture; for wallet balances, a licensed provider would need a hold-and-release ledger. We do not intend to custody passenger funds ourselves.”

**3. What about passengers who don't use the app?**

“QR events identify app reservations, tap events identify paid walk-ins, and an onboard door counter estimates entries and exits. The driver can resolve exceptions. The camera counts occupancy; it does not need facial recognition.”

**4. How will you know the queue or ETA is accurate?**

“We will begin with operator departure events, check-in/boarding timestamps and driver location updates. During a corridor pilot, we will compare predicted waits and ETAs with observed results, then tune the model. The current demo data is simulated.”

**5. Why not just build another ticketing app?**

“Because the important decision happens before someone buys a ticket. Q-not combines supply visibility, wait pressure, conditional seat commitment, walk-in reconciliation and the full route journey. A ticket is only one event inside that system.”

## Honest prototype boundary

- **Shown in the prototype:** the Q-not web experience, sample departure data, interactive payment-hold/release states, simulated waitlist replacement, simulated boarding/tap/camera events, route progress, operator/driver interface routes and 3D visual.
- **Not connected:** Hisa, payment provider, live wallet, real refunds, NFC reader, camera/edge device, live bus GPS, live operator data and real-time passenger notifications.
- **Evidence available:** 9 automated tests passed, TypeScript check passed and Next.js production build passed in the local run reported on 20 November 2026. These do not prove end-to-end auth or live integrations.
