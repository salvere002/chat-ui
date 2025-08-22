import json
import random
import re
from typing import Dict, List, Any, Optional

class ChartGenerator:
    """Generate chart data based on user input keywords"""
    
    # Chart keywords and their associated chart types
    CHART_KEYWORDS = {
        'bar': ['bar chart', 'bar graph', 'column chart', 'histogram'],
        'line': ['line chart', 'line graph', 'trend', 'time series'],
        'pie': ['pie chart', 'pie graph', 'distribution', 'percentage'],
        'area': ['area chart', 'area graph', 'filled chart'],
        'scatter': ['scatter plot', 'scatter chart', 'correlation', 'xy plot']
    }
    
    # Sample data generators for different scenarios
    SAMPLE_DATA_SETS = {
        'sales': [
            {"name": "Jan", "value": 400, "target": 350},
            {"name": "Feb", "value": 300, "target": 320},
            {"name": "Mar", "value": 500, "target": 450},
            {"name": "Apr", "value": 200, "target": 280},
            {"name": "May", "value": 700, "target": 600},
            {"name": "Jun", "value": 450, "target": 400}
        ],
        'performance': [
            {"month": "Q1", "revenue": 4000, "expenses": 2400, "profit": 1600},
            {"month": "Q2", "revenue": 3000, "expenses": 1398, "profit": 1602},
            {"month": "Q3", "revenue": 2000, "expenses": 980, "profit": 1020},
            {"month": "Q4", "revenue": 2780, "expenses": 1908, "profit": 872}
        ],
        'demographics': [
            {"name": "18-25", "value": 23},
            {"name": "26-35", "value": 34},
            {"name": "36-45", "value": 28},
            {"name": "46-55", "value": 15}
        ],
        'devices': [
            {"name": "Q1", "desktop": 45, "mobile": 30, "tablet": 15},
            {"name": "Q2", "desktop": 40, "mobile": 35, "tablet": 18},
            {"name": "Q3", "desktop": 35, "mobile": 40, "tablet": 20},
            {"name": "Q4", "desktop": 38, "mobile": 42, "tablet": 22}
        ],
        'correlation': [
            {"x": 10, "y": 30}, {"x": 20, "y": 45}, {"x": 30, "y": 25},
            {"x": 40, "y": 60}, {"x": 50, "y": 55}, {"x": 60, "y": 40}
        ]
    }
    
    @classmethod
    def detect_chart_request(cls, text: str) -> Optional[str]:
        """
        Detect if the user is requesting a chart and return the chart type
        
        Args:
            text: User input text
            
        Returns:
            Chart type if detected, 'all' for all charts, None otherwise
        """
        text_lower = text.lower()
        
        # Check for test all charts request first
        test_keywords = [
            'test all charts', 'show all charts', 'all chart types',
            'test charts', 'demo charts', 'chart examples', 'all supported charts'
        ]
        
        if any(keyword in text_lower for keyword in test_keywords):
            return 'all'
        
        # Check for explicit chart keywords
        for chart_type, keywords in cls.CHART_KEYWORDS.items():
            for keyword in keywords:
                if keyword in text_lower:
                    return chart_type
        
        # Check for chart-related terms
        chart_indicators = [
            'chart', 'graph', 'plot', 'visualize', 'visualization', 
            'show data', 'display data', 'analytics', 'metrics'
        ]
        
        if any(indicator in text_lower for indicator in chart_indicators):
            # Default to bar chart if no specific type detected
            return 'bar'
            
        return None
    
    @classmethod
    def detect_data_context(cls, text: str) -> str:
        """
        Detect what kind of data the user might be interested in
        
        Args:
            text: User input text
            
        Returns:
            Data context key
        """
        text_lower = text.lower()
        
        if any(word in text_lower for word in ['sales', 'revenue', 'money', 'profit']):
            return 'sales'
        elif any(word in text_lower for word in ['performance', 'metrics', 'quarterly']):
            return 'performance'
        elif any(word in text_lower for word in ['age', 'demographic', 'population']):
            return 'demographics'
        elif any(word in text_lower for word in ['device', 'platform', 'browser']):
            return 'devices'
        elif any(word in text_lower for word in ['correlation', 'relationship', 'scatter']):
            return 'correlation'
        else:
            return 'sales'  # Default
    
    @classmethod
    def generate_chart_data(cls, chart_type: str, data_context: str = 'sales') -> Dict[str, Any]:
        """
        Generate appropriate chart data based on type and context
        
        Args:
            chart_type: Type of chart to generate
            data_context: Context for the data
            
        Returns:
            Chart data dictionary
        """
        base_data = cls.SAMPLE_DATA_SETS.get(data_context, cls.SAMPLE_DATA_SETS['sales'])
        
        # Generate random variations to make data more interesting
        if data_context == 'sales':
            data = []
            for item in base_data:
                data.append({
                    "name": item["name"],
                    "value": item["value"] + random.randint(-50, 50),
                    "target": item.get("target", item["value"] * 0.9)
                })
        elif data_context == 'performance':
            data = []
            for item in base_data:
                revenue = item["revenue"] + random.randint(-200, 200)
                expenses = item["expenses"] + random.randint(-100, 100)
                data.append({
                    "month": item["month"],
                    "revenue": revenue,
                    "expenses": expenses,
                    "profit": revenue - expenses
                })
        elif data_context == 'correlation':
            data = []
            for item in base_data:
                data.append({
                    "x": item["x"] + random.randint(-5, 5),
                    "y": item["y"] + random.randint(-10, 10)
                })
        elif data_context == 'devices':
            # For devices, handle the new multi-series structure
            data = []
            for item in base_data:
                data.append({
                    "name": item["name"],
                    "desktop": item["desktop"] + random.randint(-3, 3),
                    "mobile": item["mobile"] + random.randint(-3, 3),
                    "tablet": item["tablet"] + random.randint(-2, 2)
                })
        else:
            # For demographics, add some randomization
            data = []
            for item in base_data:
                data.append({
                    "name": item["name"],
                    "value": item["value"] + random.randint(-5, 5)
                })
        
        # Configure chart based on type and context
        config = cls._get_chart_config(chart_type, data_context)
        
        # Adjust data keys based on chart type and data
        if chart_type == 'scatter':
            config['xKey'] = 'x'
            config['yKey'] = 'y'
        elif data_context == 'performance':
            config['xKey'] = 'month'
            # Use multiple keys for richer visualization
            if chart_type in ['line', 'area', 'bar']:
                config['yKey'] = ['revenue', 'expenses', 'profit']
            else:
                config['yKey'] = 'revenue'
        elif data_context == 'sales':
            config['xKey'] = 'name'
            # Use multiple keys for sales data
            if chart_type in ['line', 'area', 'bar']:
                config['yKey'] = ['value', 'target']
            else:
                config['yKey'] = 'value'
        elif data_context == 'devices':
            config['xKey'] = 'name'
            # Use multiple keys for device data
            if chart_type in ['line', 'area', 'bar']:
                config['yKey'] = ['desktop', 'mobile', 'tablet']
            else:
                config['yKey'] = 'desktop'
        else:
            # For other cases, use simple single key
            config['yKey'] = 'value'
        
        return {
            "type": chart_type,
            "data": data,
            "config": config
        }
    
    @classmethod
    def _get_chart_config(cls, chart_type: str, data_context: str) -> Dict[str, Any]:
        """Get appropriate configuration for chart type and context"""
        
        base_config = {
            "height": 300,
            "colors": ["#8884d8", "#82ca9d", "#ffc658", "#ff7300", "#00ff7f"]
        }
        
        context_configs = {
            'sales': {
                "title": "Sales Performance",
                "xLabel": "Month",
                "yLabel": "Sales ($)",
                "xKey": "name",
                "yKey": "value"
            },
            'performance': {
                "title": "Quarterly Performance",
                "xLabel": "Quarter",
                "yLabel": "Amount ($)",
                "xKey": "month",
                "yKey": "revenue"
            },
            'demographics': {
                "title": "Age Demographics",
                "xLabel": "Age Group",
                "yLabel": "Percentage",
                "xKey": "name",
                "yKey": "value"
            },
            'devices': {
                "title": "Device Usage",
                "xLabel": "Device Type",
                "yLabel": "Usage (%)",
                "xKey": "name",
                "yKey": "value"
            },
            'correlation': {
                "title": "Data Correlation",
                "xLabel": "X Values",
                "yLabel": "Y Values",
                "xKey": "x",
                "yKey": "y"
            }
        }
        
        config = {**base_config, **context_configs.get(data_context, context_configs['sales'])}
        
        # Chart type specific adjustments
        if chart_type == 'pie':
            config["height"] = 350
            config["title"] = config["title"].replace("Performance", "Distribution")
        elif chart_type == 'line':
            config["title"] = config["title"].replace("Performance", "Trend")
        elif chart_type == 'area':
            config["title"] = config["title"].replace("Performance", "Area Analysis")
        
        return config
    
    @classmethod
    def create_chart_markdown(cls, chart_data: Dict[str, Any]) -> str:
        """
        Create markdown with embedded chart using table format
        
        Args:
            chart_data: Chart data dictionary
            
        Returns:
            Markdown string with chart code block
        """
        return cls._create_table_format_markdown(chart_data)
    
    @classmethod
    def _create_table_format_markdown(cls, chart_data: Dict[str, Any]) -> str:
        """
        Create markdown table format chart
        
        Args:
            chart_data: Chart data dictionary
            
        Returns:
            Markdown string with table format chart
        """
        chart_type = chart_data.get('type', 'bar')
        data = chart_data.get('data', [])
        config = chart_data.get('config', {})
        
        if not data:
            return "No data available for chart"
        
        # Build attributes string from config - use | as separator to avoid spaces
        attributes = [f'type={chart_type}']
        
        if config.get('title'):
            # Replace spaces in title with underscores for language identifier
            title_safe = config["title"].replace(' ', '_')
            attributes.append(f'title={title_safe}')
        if config.get('xKey'):
            x_key = config['xKey']
            if isinstance(x_key, list):
                x_key = x_key[0]  # Use first key for table format
            attributes.append(f'x={x_key}')
        if config.get('yKey'):
            y_key = config['yKey']
            if isinstance(y_key, list):
                y_key = y_key[0]  # Use first key for table format
            attributes.append(f'y={y_key}')
        if config.get('xLabel'):
            # Replace spaces for language identifier
            xlabel_safe = config["xLabel"].replace(' ', '_')
            attributes.append(f'xlabel={xlabel_safe}')
        if config.get('yLabel'):
            # Replace spaces for language identifier
            ylabel_safe = config["yLabel"].replace(' ', '_')
            attributes.append(f'ylabel={ylabel_safe}')
        if config.get('height') and config['height'] != 320:
            attributes.append(f'height={config["height"]}')
        if config.get('colors'):
            # Simplified colors - just use first color for language identifier
            attributes.append(f'color={config["colors"][0]}')
        
        # Use | as separator instead of spaces
        attribute_string = '|'.join(attributes)
        
        # Extract all column names from data
        all_keys = set()
        for item in data:
            all_keys.update(item.keys())
        
        # Sort keys to ensure consistent column order
        columns = sorted(list(all_keys))
        
        # Build markdown table
        table_lines = []
        
        # Header row
        header = '| ' + ' | '.join(columns) + ' |'
        table_lines.append(header)
        
        # Separator row  
        separator = '|' + '|'.join(['-' * (len(col) + 2) for col in columns]) + '|'
        table_lines.append(separator)
        
        # Data rows
        for item in data:
            row_values = []
            for col in columns:
                value = item.get(col, '')
                # Format numbers nicely
                if isinstance(value, (int, float)):
                    row_values.append(str(value))
                else:
                    row_values.append(str(value))
            row = '| ' + ' | '.join(row_values) + ' |'
            table_lines.append(row)
        
        table_content = '\n'.join(table_lines)
        
        return f"""Here's your {chart_type} chart visualization using the new table format:

```chart{{{attribute_string}}}
{table_content}
```

This chart uses markdown table format for better readability and AI-friendly generation."""

    @classmethod
    def create_all_charts_markdown(cls, data_context: str = 'sales') -> str:
        """
        Create markdown with all supported chart types for testing
        
        Args:
            data_context: Context for the data (default: 'sales')
            
        Returns:
            Markdown string with all chart types
        """
        chart_types = ['bar', 'line', 'pie', 'area', 'scatter']
        markdown_parts = []
        
        markdown_parts.append("# Chart Testing - All Chart Types")
        markdown_parts.append("Here are examples of all supported chart types using markdown table format:")
        markdown_parts.append("")
        
        for chart_type in chart_types:
            # Use different data contexts for each chart type
            if chart_type == 'bar':
                context = 'sales'
            elif chart_type == 'line':
                context = 'performance'
            elif chart_type == 'pie':
                context = 'demographics'
            elif chart_type == 'area':
                context = 'devices'
            elif chart_type == 'scatter':
                context = 'correlation'
            else:
                context = 'sales'
            
            chart_data = cls.generate_chart_data(chart_type, context)
            
            # Table format only
            markdown_parts.append(f"## {chart_type.title()} Chart")
            markdown_parts.append("")
            table_chart = cls._create_table_format_markdown(chart_data)
            # Extract just the code block part
            table_lines = table_chart.split('\n')
            in_code_block = False
            for line in table_lines:
                if line.startswith('```chart{'):
                    in_code_block = True
                    markdown_parts.append(line)
                elif line == '```' and in_code_block:
                    markdown_parts.append(line)
                    in_code_block = False
                    break
                elif in_code_block:
                    markdown_parts.append(line)
            markdown_parts.append("")
        
        markdown_parts.append("All charts above should render as interactive visualizations.")
        
        return "\n".join(markdown_parts)

    @classmethod
    def detect_test_all_charts(cls, text: str) -> bool:
        """
        Detect if user wants to test all chart types
        
        Args:
            text: User input text
            
        Returns:
            True if user wants to test all charts
        """
        text_lower = text.lower()
        test_keywords = [
            'test all charts',
            'show all charts', 
            'all chart types',
            'test charts',
            'demo charts',
            'chart examples',
            'all supported charts'
        ]
        
        return any(keyword in text_lower for keyword in test_keywords)
    

# Example usage and test functions
def test_chart_detection():
    """Test the chart detection functionality"""
    test_cases = [
        "Show me a bar chart of sales data",
        "Can you create a line graph?", 
        "I need a pie chart for demographics",
        "Display performance metrics",
        "Show correlation data",
        "Test all charts",
        "Show all chart types",
        "Just regular text"
    ]
    
    for text in test_cases:
        test_all = ChartGenerator.detect_test_all_charts(text)
        chart_type = ChartGenerator.detect_chart_request(text)
        data_context = ChartGenerator.detect_data_context(text)
        print(f"'{text}' -> Test All: {test_all}, Chart: {chart_type}, Context: {data_context}")

def test_all_charts_generation():
    """Test generating all chart types"""
    print("Testing all chart types generation...")
    markdown_table = ChartGenerator.create_all_charts_markdown('sales')
    print("Generated table markdown length:", len(markdown_table))
    print("First 200 characters:")
    print(markdown_table[:200] + "...")

def test_table_format():
    """Test the table format generation"""
    print("Testing table format generation...")
    chart_data = ChartGenerator.generate_chart_data('bar', 'sales')
    table_markdown = ChartGenerator.create_chart_markdown(chart_data)
    print("Generated table format:")
    print(table_markdown)

if __name__ == "__main__":
    test_chart_detection()
    print("\n" + "="*50 + "\n")
    test_all_charts_generation()
    print("\n" + "="*50 + "\n")
    test_table_format()