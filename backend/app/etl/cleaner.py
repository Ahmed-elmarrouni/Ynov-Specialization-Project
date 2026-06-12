import pandas as pd
import numpy as np

class ETLDataCleaner:
    """
    Advanced ETL Transformation Layer.
    Applies data governance, type coercion, and business rules to raw dataframes.
    """

    @staticmethod
    def _clean_generic(df: pd.DataFrame, required_columns: list) -> pd.DataFrame:
        df = df.dropna(how='all')
        
        df = df.dropna(subset=required_columns)
        
        for col in df.select_dtypes(['object']).columns:
            df[col] = df[col].astype(str).str.strip()
            
        return df

    @classmethod
    def process(cls, df: pd.DataFrame, target_table: str, required_columns: list) -> pd.DataFrame:
        """
        Main Router: Applies generic cleaning, then routes to table-specific business rules.
        """
        df = cls._clean_generic(df, required_columns)
        
        cleaners = {
            "students": cls._clean_students,
            "grades": cls._clean_grades,
            "modules": cls._clean_modules,
            "attendance": cls._clean_attendance
        }
        
        specific_cleaner = cleaners.get(target_table)
        if specific_cleaner:
            df = specific_cleaner(df)
            
        return df


    @staticmethod
    def _clean_students(df: pd.DataFrame) -> pd.DataFrame:
        # Email: Lowercase & Deduplication (keep latest)
        if 'email' in df.columns:
            df['email'] = df['email'].str.lower()
            df = df.drop_duplicates(subset=['email'], keep='last')
        
        # Names: Standardize formatting (Firstname Lastname)
        if 'first_name' in df.columns:
            df['first_name'] = df['first_name'].str.title()
            
        if 'last_name' in df.columns:
            df['last_name'] = df['last_name'].str.upper()
            
        # IDs: Force uppercase for standardization
        if 'student_id_number' in df.columns:
            df['student_id_number'] = df['student_id_number'].str.upper()
            
        return df

    @staticmethod
    def _clean_grades(df: pd.DataFrame) -> pd.DataFrame:
        if 'is_absent' in df.columns:
            df['is_absent'] = df['is_absent'].astype(str).str.lower().isin(['true', '1', 'yes', 'vrai'])
            
        # Scores: Coerce to Float, Clamp to 0-20, force 0 if absent
        if 'score' in df.columns:
            df['score'] = pd.to_numeric(df['score'], errors='coerce').fillna(0.0)
            
            # Apply business rule: Absent students get a 0
            df.loc[df['is_absent'] == True, 'score'] = 0.0
            
            df['score'] = df['score'].clip(lower=0.0, upper=20.0) 
            
        return df

    @staticmethod
    def _clean_modules(df: pd.DataFrame) -> pd.DataFrame:
        if 'code' in df.columns:
            df['code'] = df['code'].str.upper()
            
        if 'credits' in df.columns:
            df['credits'] = pd.to_numeric(df['credits'], errors='coerce').fillna(1).astype(int)
            
        return df

    @staticmethod
    def _clean_attendance(df: pd.DataFrame) -> pd.DataFrame:
        if 'status' in df.columns:
            df['status'] = df['status'].str.title()
            valid_statuses = ['Present', 'Absent', 'Late', 'Excused']
            df.loc[~df['status'].isin(valid_statuses), 'status'] = 'Absent'
            
        return df