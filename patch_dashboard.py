import os

file_path = "src/views/dashboard.ejs"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Extract CSS
start_style = content.find('<style>')
end_style = content.find('</style>') + len('</style>')
if start_style != -1 and end_style != -1:
    css_content = content[start_style + len('<style>'):end_style - len('</style>')].strip()
    with open("public/css/dashboard.css", "w", encoding="utf-8") as f:
        f.write(css_content)
    content = content[:start_style] + '<link rel="stylesheet" href="/css/dashboard.css">' + content[end_style:]

# 2. Extract JS
start_script = content.rfind('<script>')
end_script = content.rfind('</script>') + len('</script>')
if start_script != -1 and end_script != -1:
    js_content = content[start_script + len('<script>'):end_script - len('</script>')].strip()
    
    js_lines = js_content.split('\n')
    if len(js_lines) > 0 and "userRole =" in js_lines[0]:
        js_lines = js_lines[1:] # remove EJS line
    actual_js = "const userRole = window.userRole;\n" + "\n".join(js_lines)
    
    with open("public/js/dashboard.js", "w", encoding="utf-8") as f:
        f.write(actual_js)
    
    replacement_script = """<script>
    window.userRole = '<%= user.role %>';
  </script>
  <script src="/js/dashboard.js"></script>"""
    content = content[:start_script] + replacement_script + content[end_script:]

# 3. Extract Views
views = ['dashboard', 'productos', 'categorias', 'usuarios', 'empresa']
for view in views:
    start_view = content.find(f'<!-- VIEW: {view.upper()} -->')
    if start_view == -1:
        continue
        
    next_view_idx = -1
    idx = views.index(view)
    if idx < len(views) - 1:
        next_view = views[idx+1]
        next_view_idx = content.find(f'<!-- VIEW: {next_view.upper()} -->', start_view)
        
    if next_view_idx == -1:
        # Last view, find end of Views Container
        next_view_idx = content.find('\n    </div>\n\n    <!-- Bottom Navigation (Mobile) -->', start_view)
        if next_view_idx == -1:
            # Fallback
            next_view_idx = content.find('<!-- Bottom Navigation (Mobile) -->', start_view)
        
    if next_view_idx != -1:
        view_content = content[start_view:next_view_idx].strip()
        
        with open(f"src/views/partials/view-{view}.ejs", "w", encoding="utf-8") as f:
            f.write(view_content + "\n")
            
        include_str = f"<!-- VIEW: {view.upper()} -->\n      <%- include('partials/view-{view}') %>\n"
        content = content[:start_view] + include_str + content[next_view_idx:]

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Done refactoring dashboard.ejs!")
