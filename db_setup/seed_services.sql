-- Optional: Clear existing data from the services table if you want this script to be re-runnable
-- without creating duplicate entries (be careful with this on a live database later).
-- For initial seeding, it's fine. If you run this multiple times without DELETE, you'll get duplicates.
-- Consider adding unique constraints on 'name' if names should be unique.
-- For now, let's assume we might re-run it and want to clear old data first:
TRUNCATE TABLE services RESTART IDENTITY CASCADE; -- Deletes all rows and resets the ID sequence

INSERT INTO services (name, price_string, description, category) VALUES
('Dog Walking', '$30/hour', 'I’ll pick up your dog at an agreed time and take them for a fun, enriching walk (up to 2 hours). Includes off-lead play (where safe), sniffy strolls, and hydration breaks. Guaranteed tail wags.', 'Regular'),
('Puppy Training (Basic Manners)', '$45/session (45 mins)', 'One-on-one positive reinforcement training covering sit, stay, recall, loose-leash walking, and polite greetings. Tailored to your pup’s needs and energy levels.', 'Regular'),
('Pet Sitting (Dogs or Cats)', '$40/day (drop-in) or $75 overnight', 'In-home visits while you’re away: feeding, cuddles, litter cleaning or walkies. Overnight stays include evening and morning routines and loads of TLC.', 'Regular'),
('Cat Visits', '$30 per visit (30–45 mins)', 'Feeding, litter scooping, brush ‘n’ purr session, playtime and company. Perfect for shy kitties who prefer to stay in their castle.', 'Regular'),
('Group Dog Walks', '$25/hour per dog', 'Social walkies with 2–4 friendly dogs in a nearby park or trail. Great for dogs who love company and shared adventures.', 'Regular'),
('Doggy Day Trip', '$90 (3–4 hours)', 'A mini-excursion to the beach, bush, or dog-friendly hiking trail. Includes pick-up, transport, treats, and tons of mental stimulation. Photo updates included!', 'Regular'),
('Groom ''n'' Go', '$45 per session', 'Brushing, light trimming (face/paws), ear cleaning, and a gentle bath if needed. No show cuts, just stress-free grooming and a happy pet.', 'Regular'), -- Note: Groom 'n' Go escaped
('Nail Clipping', '$15', 'Quick, calm, and kind. Nail trims done with a gentle touch and lots of reassurance.', 'Regular'),
('Pet Taxi', '$25 per trip (within 10km)', 'Need help getting your pet to the vet, groomer, or daycare? I’ll safely transport them door to door.', 'Regular'),
('Behaviour Consult', '$70 (1 hour)', 'Struggling with barking, jumping, anxiety, or leash pulling? Let’s talk. Includes a written action plan and follow-up by message.', 'Regular'),
('Walk & Train Combo', '$65/session (90 mins)', 'A 45-minute training session followed by a 45-minute decompression walk. Great for reinforcing new skills in the real world. Calm minds, happy paws.', 'Specials'),
('Purrfect Weekend Package', '$110 (Fri–Sun, 2 visits per day)', 'Includes feeding, playtime, litter duties, grooming, and cuddles for cats or small pets while you''re away for the weekend. Up to 3 pets included.', 'Specials'), -- Note: you're escaped
('Weekly Walker Deal', '$130/week (5 x 1-hour walks)', 'Save on daily dog walks with this Monday-to-Friday pack. Same pick-up window each day; tailored to your dog’s energy and temperament.', 'Specials'),
('Double Trouble Walk', '$45/hour (for 2 dogs from the same household)', 'Two pups, one handler, one great adventure. Off-lead play, enrichment, and sibling bonding time — with a discount for keeping it in the family.', 'Specials'),
('Buddy Boarding Add-On', '$30/night per extra pet', 'Staying overnight? Bring the whole crew. Add a second dog, cat, or compatible small pet to your overnight booking for just $30 extra.', 'Specials'),
('Pet Sitting Week Pass', '$250/week (7 daily visits)', 'Daily 30–45 min visits for feeding, clean-up, and companionship. Ideal for cats, small pets, or older dogs who prefer their home turf.', 'Specials'),
('Full Fur-mily Package', '$180/week (includes 2 walks, 2 home visits, 1 grooming session)', 'All-in-one care for homes with cats and dogs (or other critters). Customizable to suit your schedule and species mix.', 'Specials'),
('Training + Follow-Up Bundle', '$160 (3 sessions over 2 weeks)', 'Includes 2 live sessions + 1 follow-up recap (by phone or Zoom) with written training tips and progress notes. Ideal for new rescues or puppies.', 'Specials'),
('Multi-Critter Sitting', '$50/day (up to 4 animals)', 'Feeding, litter or cage cleaning, fresh bedding, and love for multi-species homes. Cats, rabbits, guinea pigs, birds, and more.', 'Specials'),
('Refer a Fur-iend', '$10 credit for each new client booked', 'Word of mouth is golden. When a friend books and mentions your name, you both get a treat — in your case, a $10 service credit.', 'Specials');

\echo 'Services table seeded successfully with initial data.';
