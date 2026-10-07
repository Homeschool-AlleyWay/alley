pack: hs-science
title: High School Science Electives
subject: science
kind: elective
grades: 9-12
course: Computer Science & Psychology

@book Science Electives Textbook
## Computer Science: Algorithms and loops
### What is an algorithm
An algorithm is a list of clear steps that solves a problem. A recipe is an algorithm. Computers need steps that are exact and in order.
### Loops and decisions
- A loop repeats steps until a condition is met.
- An if-statement chooses between steps depending on a condition.
- Programs combine sequence, loops and decisions.
Example: while the number of laps is less than 3, run one lap and add 1 to the count.
### Debugging
A bug is a mistake in the steps. To debug: read the steps, predict the result, test, and change one thing at a time.
## Psychology: Memory and learning
### How memory works
Information moves from sensory memory to short-term (working) memory, and with practice into long-term memory.
### Study methods that work
- Spaced practice beats cramming.
- Testing yourself beats rereading.
- Explaining an idea in your own words shows what you really know.

@lesson Computer Science: Algorithms and loops
blurb: Exact steps, loops and decisions.
intro: Welcome to Computer Science. Today we learn how to give a computer exact instructions.
points:
- An algorithm is a list of exact steps
- A loop repeats steps until a condition is met
- An if-statement chooses between steps
- Debugging means finding and fixing mistakes in the steps
examples:
- Making a sandwich is an algorithm, if every step is exact
- Loop: repeat "take a step" 10 times
- If it is raining then take an umbrella, otherwise take sunglasses
script:
- say[smile,wave]: Welcome to Computer Science. Today you become the programmer and I become the robot.
- board[left] Algorithm: Exact steps | In order | Repeat with loops | Choose with if
- say[explain]: Tell me how to cross the room. If you say 'walk', I'll walk into the wall. Computers do exactly what we say, not what we mean.
- ask
- say[joy]: A loop saves work: instead of writing 'step' ten times, write 'repeat ten times: step'.
- say[thinking]: And when it breaks, a bug is not a failure. Debugging is the job.
- read: Computer Science: Algorithms and loops/Debugging
check: order Put the steps of this loop in order: counting laps.
- Set the lap count to 0
- Ask: is the count less than 3?
- Run one lap
- Add 1 to the count and go back to the question
glossary:
- algorithm: A list of exact steps that solves a problem.
- loop: A set of steps that repeats until a condition is met.
- bug: A mistake in a program's steps.
whys:
- Computers can't guess what we mean, so steps must be exact.
- Loops let a few lines of code do thousands of repeats.
wrap: Exact steps, loops, decisions, and patient debugging. That is programming.
homework: Write an algorithm for brushing your teeth using one loop and one if-statement.
book: Computer Science: Algorithms and loops

@lesson Psychology: Memory and learning
blurb: How memory works and how to study with it.
intro: Welcome to Psychology. Today: how your memory works, and how to use it on purpose.
points:
- Sensory, short-term and long-term memory
- Short-term memory holds only a few items for a short time
- Practice moves information into long-term memory
- Spaced practice and self-testing beat cramming
examples:
- Remembering a phone number just long enough to dial it is short-term memory
- Riding a bike years later is long-term memory
- Five 10-minute sessions beat one 50-minute session
script:
- say[smile]: Psychology is the science of how people think, feel and act. Today we study the thing you are using right now, your memory.
- board[left] Memory: Sensory (seconds) | Short-term (about 20 seconds) | Long-term (years)
- say[explain]: Cramming feels productive because the facts are fresh in short-term memory. But they fade fast. Spacing your practice tells your brain this is worth keeping.
- ask
- say[thinking]: Here is a test. Close your eyes and say three things from today's class. That is practice you can do anywhere.
- read: Psychology: Memory and learning/Study methods that work
check: sort Which study method is it?
- Works well: Spaced practice | Testing yourself | Explaining it aloud
- Works poorly: Cramming the night before | Rereading again and again | Highlighting everything
glossary:
- memory: The ability to store and recall information.
- cognition: The mental process of thinking, knowing and learning.
- retrieval: Pulling a memory back out of storage.
whys:
- Recalling a memory strengthens it, which is why self-testing works.
- Spacing gives the brain time to consolidate what you learned.
wrap: Study a little, often, and test yourself. Your memory will do the rest.
homework: Make a three-question quiz on today's lesson and take it again tomorrow.
book: Psychology: Memory and learning
