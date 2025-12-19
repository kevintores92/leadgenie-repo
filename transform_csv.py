#!/usr/bin/env python3
import pandas as pd
import os

# Read the CSV file
input_file = r'C:\Users\Anne Gayl\Documents\GitHub\leadgenie-repo\my-saas-platform\Property Export High+Equity-contact-append.csv'
output_file = r'C:\Users\Anne Gayl\Documents\GitHub\leadgenie-repo\my-saas-platform\Property Export High+Equity-contact-append-SPLIT.csv'

try:
    # Read with low_memory=False to avoid dtype warnings
    df = pd.read_csv(input_file, low_memory=False)
    
    print(f"📥 Loaded {len(df)} rows")
    print(f"📊 Original columns: {len(df.columns)}")
    
    # Create new dataframe with split columns
    new_df = pd.DataFrame()
    
    # Map owner first/last names to First Name / Last Name
    new_df['First Name'] = df.get('Owner 1 First Name', '')
    new_df['Last Name'] = df.get('Owner 1 Last Name', '')
    
    # Map property address columns
    new_df['Address'] = df.get('Address', '')
    new_df['City'] = df.get('City', '')
    new_df['State'] = df.get('State', '')
    new_df['Zip'] = df.get('Zip', '')
    
    # Map mailing address columns
    new_df['Mailing Address'] = df.get('Mailing Address', '')
    new_df['Mailing Unit #'] = df.get('Mailing Unit #', '')
    new_df['Mailing City'] = df.get('Mailing City', '')
    new_df['Mailing State'] = df.get('Mailing State', '')
    new_df['Mailing Zip'] = df.get('Mailing Zip', '')
    
    # Add phone
    new_df['Phone'] = df.get('Mobile Phone', '')
    
    # Add other useful fields
    if 'County' in df.columns:
        new_df['County'] = df['County']
    if 'Property Type' in df.columns:
        new_df['Property Type'] = df['Property Type']
    if 'Bedrooms' in df.columns:
        new_df['Bedrooms'] = df['Bedrooms']
    if 'Total Bathrooms' in df.columns:
        new_df['Bathrooms'] = df['Total Bathrooms']
    if 'Est. Value' in df.columns:
        new_df['Est. Value'] = df['Est. Value']
    if 'Est. Equity' in df.columns:
        new_df['Est. Equity'] = df['Est. Equity']
    
    # Write the new CSV
    new_df.to_csv(output_file, index=False)
    
    print(f"✅ Created {len(new_df)} rows")
    print(f"📋 New columns: {len(new_df.columns)}")
    print(f"📁 Output: {output_file}")
    print(f"\n🎯 Columns in new file:")
    for col in new_df.columns:
        print(f"  - {col}")
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
