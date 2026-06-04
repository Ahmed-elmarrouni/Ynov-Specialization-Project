# Data Generation Process

In this phase of the project, my goal was to generate a large amount of realistic data to fill my PostgreSQL database. This data is critical because I will need it later to train my Machine Learning models (for predicting student failure risk and clustering student profiles)

## First Attempt: Using Mockaroo

I initially started using Mockaroo to generate my CSV files. However, I quickly ran into a major limitation. Mockaroo's free tier only allows you to generate a maximum of 1,000 rows per file.

Because one student can have multiple grades and absences, 1,000 rows total was not enough data for a real-world Machine Learning project. I needed thousands of rows to train an accurate model, so I stopped using Mockaroo.

## Second Attempt: The Python Data Engineer Approach

To bypass the 1,000-row limit, I decided to write a custom Python script using the `pandas` and `faker` libraries.

This approach was much better because I could generate as much data as I wanted. More importantly, I programmed mathematical correlations into the data. For example, the script assigns a hidden "truancy" (absence) probability to students. If a student is absent often, their generated grades are mathematically lower

## Technical Errors and Solutions

While trying to run the Python script, I faced several environment errors on my Mac:

1. **`zsh: command not found: python`**: My Mac did not recognize the standard `python` command, so I had to use `python3` instead.
2. **`ModuleNotFoundError: No module named 'pandas'`**: Even after installing the libraries, Python could not find them. This happened because my Mac has multiple versions of Python installed, and `pip` installed the packages into the wrong version.
3. **`externally-managed-environment` Error**: When I tried to force the installation using `python3 -m pip`, macOS blocked me. Modern Macs protect the global system from being modified by external Python packages to prevent the OS from breaking.
4. **Broken `requirements.txt`**: I tried to install packages from my `requirements.txt` file, but it failed with an `OSError` because the file contained hidden Apple internal paths that `pip` could not read.

### How I Fixed It: Virtual Environments

To solve all of these macOS protections and path errors, I created a **Python Virtual Environment (`venv`)**.

By running `python3 -m venv venv` and activating it with `source venv/bin/activate`, I created a safe, isolated bubble for my project. Inside this virtual environment, I was able to successfully run `pip install pandas faker` without any macOS restrictions.

## Final Result

After fixing the environment, the script ran perfectly. I successfully generated 10 CSV files containing thousands of rows of realistic, mathematically correlated data:

- `academic_years.csv`
- `cohort_modules.csv`
- `cohorts.csv`
- `evaluations.csv`
- `grades.csv`
- `modules.csv`
- `programs.csv`
- `students.csv`
- `teachers.csv`
- `users.csv`

The data is now safely stored in the `/data` folder, ready for the ETL (Extract, Transform, Load) pipeline!
