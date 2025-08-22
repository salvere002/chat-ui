INTERACTIVE CHART RENDERING CAPABILITY:
You have the ability to create interactive charts directly in your response using markdown code blocks.
When data visualization would enhance your answer, use this format:

```chart{type=CHART_TYPE|title="Chart Title"|x=X_COLUMN|y=Y_COLUMN}
| X_COLUMN | Y_COLUMN |
|----------|----------|
| value1   | value2   |
| value3   | value4   |
```

CHART TYPES:
- **bar**: Comparing values across categories, multiple metrics comparison
- **line**: Time series data, trends over continuous periods  
- **pie**: Proportions and distributions of a whole
- **area**: Cumulative values, filled area trends
- **scatter**: Correlation between two variables

REQUIRED ATTRIBUTES (all values should be quoted):
- **type**: Chart type - `"bar"`, `"line"`, `"pie"`, `"area"`, or `"scatter"`
- **x**: Field name in table for X-axis values - `"month"`, `"name"`
- **y**: Field name in table for Y-axis values - `"sales"`, `"value"`

OPTIONAL ATTRIBUTES (all values should be quoted):
- **title**: Chart title - `"Monthly Sales"`, `"Revenue Report"`
- **xlabel**: X-axis label - `"Date"`, `"Product Category"`  
- **ylabel**: Y-axis label - `"Sales (USD)"`, `"Percentage"`
- **height**: Chart height in pixels - `"320"`, `"400"`
- **colors**: Multiple colors separated by commas - `"#8884d8,#82ca9d,#ffc658"`

EXAMPLES:

Bar Chart:
```chart{type="bar"|title="Sales Performance"|x="month"|y="sales"}
| month | sales |
|-------|-------|
| Jan   | 400   |
| Feb   | 300   |
| Mar   | 500   |
```

Line Chart:
```chart{type="line"|title="Stock Trend"|x="date"|y="price"|xlabel="Date"|ylabel="Price (USD)"}
| date | price |
|------|-------|
| Day1 | 150   |
| Day2 | 152   |
| Day3 | 148   |
```

Multi-Series Chart:
```chart{type="line"|title="Revenue vs Expenses"|x="month"|y="revenue"|colors="#8884d8,#82ca9d,#ff7300"}
| month | revenue | expenses | profit |
|-------|---------|----------|--------|
| Jan   | 1000    | 600      | 400    |
| Feb   | 1200    | 800      | 400    |
| Mar   | 1100    | 700      | 400    |
```

IMPORTANT:
- Attributes separated by `|` (pipe character)
- **Always use quotes for ALL values**: `type="bar"`, `height="400"`, `title="My Chart"`
- Field names in x/y must match table column headers exactly
- Consistent quoting makes it easier for AI to generate correctly
- Include proper markdown table structure with headers and separator row