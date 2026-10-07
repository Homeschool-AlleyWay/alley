pack: hs-math
title: High School Math Electives
subject: math
kind: elective
grades: 9-12
course: High School Math

@book High School Math Textbook
## Algebra I: Solving equations
### Balance
An equation is a balance scale. Whatever you do to one side you must do to the other, so the two sides stay equal.
### One-step and two-step equations
- To undo adding, subtract. To undo multiplying, divide.
- Undo the addition or subtraction first, then the multiplication or division.
- Always check: put your answer back into the original equation.
Example: 3x + 5 = 20. Subtract 5: 3x = 15. Divide by 3: x = 5. Check: 3(5) + 5 = 20.
## Geometry: The Pythagorean theorem
### Right triangles
In a right triangle the two short sides (legs) a and b and the long side (hypotenuse) c follow a squared plus b squared equals c squared.
### Using it
- Finding the hypotenuse: add the squares of the legs, then take the square root.
- Finding a leg: subtract the square of the known leg from c squared, then take the square root.
Example: legs 6 and 8 give 36 + 64 = 100, so c = 10.
## Statistics: Mean, median and mode
### Three kinds of average
- Mean: add the numbers and divide by how many there are.
- Median: the middle number when they are in order.
- Mode: the number that appears most often.
### Which one to use
One very large number pulls the mean up, so the median describes a "typical" value better when data has outliers.

@lesson Algebra I: Solving equations
blurb: Keep the balance, undo operations in reverse order.
intro: Today in Algebra I we solve equations. Think of every equation as a balance scale.
points:
- An equation says two sides are equal
- Do the same thing to both sides to keep it balanced
- Undo add/subtract first, then multiply/divide
- Check your answer by putting it back in
examples:
- x + 7 = 12 gives x = 5
- 3x + 5 = 20 gives 3x = 15, so x = 5
- 2x - 4 = 10 gives 2x = 14, so x = 7
script:
- say[smile,wave]: Welcome to Algebra I! Don't worry, this is just puzzle solving with a balance scale.
- board[left] The balance rule: Same move on both sides | Undo adding or subtracting first | Then undo multiplying or dividing
- say[explain]: Look at 3x plus 5 equals 20. We peel it like an onion, outside layer first. Subtract 5 from both sides.
- ask
- say[thinking]: Now divide both sides by 3. And always check, because checking is how you know you are right.
- read: Algebra I: Solving equations/One-step and two-step equations
check: order Solve 3x + 5 = 20 in the right order.
- Start: 3x + 5 = 20
- Subtract 5 from both sides: 3x = 15
- Divide both sides by 3: x = 5
- Check: 3(5) + 5 = 20
glossary:
- equation: A statement that two things are equal, like 3x + 5 = 20.
- variable: A letter such as x that stands for a number we don't know yet.
- inverse operation: The operation that undoes another one, like subtraction undoing addition.
whys:
- Doing the same thing to both sides keeps the balance, so the answer stays true.
- We undo in reverse order because the equation was built in layers.
wrap: Keep the balance, peel the layers, and check. That is algebra.
homework: Solve 4x - 3 = 17 and 2x + 9 = 21, and show your check.
book: Algebra I: Solving equations

@lesson Geometry: The Pythagorean theorem
blurb: a squared plus b squared equals c squared.
intro: Welcome to Geometry. Today: the most famous formula about triangles.
points:
- It only works for right triangles
- The hypotenuse is the longest side, across from the right angle
- a squared + b squared = c squared
- Find c with a square root
examples:
- Legs 3 and 4 give hypotenuse 5
- Legs 6 and 8 give hypotenuse 10
- A 12 ft ladder leaning 8 ft away from a wall reaches about 8.9 ft up
script:
- say[smile]: Today's formula has been used for more than two thousand years, by builders, sailors and game designers.
- board[left] Pythagoras: Right triangle only | a squared + b squared = c squared | c is the longest side
- say[explain]: Take legs 6 and 8. Six squared is 36, eight squared is 64. Together that is 100. The square root of 100 is 10.
- ask
- say[joy]: See? You can measure a distance you cannot walk, just from two sides you can.
- read: Geometry: The Pythagorean theorem/Using it
check: sort Is this a leg or the hypotenuse? In a right triangle with sides 5, 12 and 13:
- Legs: 5 | 12
- Hypotenuse: 13
glossary:
- hypotenuse: The longest side of a right triangle, opposite the right angle.
- leg: One of the two shorter sides of a right triangle.
- square root: A number that, multiplied by itself, gives the number you started with.
whys:
- The squares are areas: the two small squares together exactly cover the big square.
- It only works for right triangles because the right angle fixes the shape.
wrap: Two squares add up to the third. Remember it for building, maps and games.
homework: A 5 ft ladder leans on a wall with its base 3 ft out. How high does it reach?
book: Geometry: The Pythagorean theorem

@lesson Statistics: Mean, median and mode
blurb: Three ways to say what is typical.
intro: Welcome to Statistics. Today: the three kinds of average and when to trust each.
points:
- Mean: add them up, divide by how many
- Median: the middle value in order
- Mode: the most common value
- Outliers pull the mean but not the median
examples:
- 2, 3, 3, 4, 8: mean 4, median 3, mode 3
- Salaries with one billionaire: the median is more honest than the mean
- Quiz scores 7, 8, 8, 9, 10: mode 8
script:
- say[smile]: Numbers can be used to inform or to mislead. Statistics teaches you which is which.
- board[left] Three averages: Mean = total / count | Median = middle | Mode = most often
- say[explain]: Here are five test scores: 2, 3, 3, 4 and 8. The mean is 20 divided by 5, so 4. The middle is 3.
- ask
- say[thinking]: Which would you quote to say what a typical student scored? When one number is far out, the median is safer.
- read: Statistics: Mean, median and mode/Which one to use
check: sort Which average is being described?
- Mean: add and divide | the balance point
- Median: the middle number | half above, half below
- Mode: the most frequent number | the most popular
glossary:
- outlier: A value far away from the rest of the data.
- data: Facts or numbers collected to answer a question.
- average: A single number that tries to describe a whole set.
whys:
- Different averages answer different questions about the same data.
- Outliers drag the mean toward them, because every value counts in the total.
wrap: Mean, median, mode. Choose the one that tells the truth about your data.
homework: Collect the ages of five people you know. Find the mean, median and mode.
book: Statistics: Mean, median and mode
