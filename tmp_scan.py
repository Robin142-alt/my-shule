import os

exclude_dirs = {'.git', 'node_modules', '.agents', '.next'}
files_with_time = []

for root, dirs, files in os.walk('.'):
    # Prune excluded directories
    dirs[:] = [d for d in dirs if d not in exclude_dirs]
    for file in files:
        filepath = os.path.join(root, file)
        try:
            mtime = os.path.getmtime(filepath)
            files_with_time.append((filepath, mtime))
        except OSError:
            pass

# Sort by mtime descending
files_with_time.sort(key=lambda x: x[1], reverse=True)

# Print top 5
for path, mtime in files_with_time[:5]:
    print(path)
