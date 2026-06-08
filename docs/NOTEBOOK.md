# Exploratory Data Analysis (EDA)

In this phase, I created the `01_EDA_and_Data_Cleaning.ipynb` notebook to analyze the academic data. The goal was to understand the data structure, observe trends, and identify students at risk.

## 1. Database Connection

I connected the Jupyter Notebook directly to my PostgreSQL database. I used `SQLAlchemy` and `python-dotenv` to securely load the database credentials from my backend `.env` file.

## 2. Grade Distribution

I wrote a SQL query to join the grades, evaluations, and modules tables. Then, I used `seaborn` and `matplotlib` to create a histogram. This visualization showed a normal distribution of grades for students who were present, confirming the quality of the generated data.

## 3. Correlation Analysis

I analyzed the relationship between absences and academic results. I created a boxplot that clearly proved the mathematical correlation in my dataset: students marked as absent received an automatic score of 0, while present students maintained a normal grade distribution.

## 4. Module Difficulty

To fulfill the requirement to analyze performance by module, I grouped the data to calculate the average score per class. I used a bar chart to visualize which modules had the lowest averages, allowing me to identify the hardest subjects.

## 5. Risk Detection System

I built an automated alert system to detect students in difficulty. I wrote a complex SQL query to calculate the general average and total absences for every student. I applied strict filtering rules (average below 10 or more than 3 absences). The system successfully identified 368 at-risk students who require pedagogical support.
