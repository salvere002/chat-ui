import { memo, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkBreaks from 'remark-breaks';
import rehypeKatex from 'rehype-katex';
import type { Components } from 'react-markdown';
import { ChartData } from '../../types/chat';
import { parseChartAttributes, parseMarkdownTable } from './utils/chartUtils';
import CodeBlock from './CodeBlock';
import { EmbeddedImage } from './FileComponents';
import ChartRenderer from '../ChartRenderer';
import ExpressionRenderer from '../ExpressionRenderer';
import LoadingIndicator from '../LoadingIndicator';

interface MemoizedMarkdownProps {
  text: string; 
  isIncomplete: boolean;
  onCodeUpdate?: (oldCode: string, newCode: string) => void;
}

const MemoizedMarkdown: React.FC<MemoizedMarkdownProps> = memo(({ text, isIncomplete, onCodeUpdate }) => {
  return (
    <div className="prose prose-sm max-w-none text-current">
      <ReactMarkdown
        children={text}
        // remark-breaks converts single newlines to <br> to preserve line-by-line spacing
        // Cast plugins to any to avoid unified type version mismatches at compile time
        remarkPlugins={[remarkGfm as any, remarkMath as any, remarkBreaks as any]}
        rehypePlugins={[rehypeKatex]}
        components={{
          // Custom table components for better styling
          table({ children, ...props }) {
            return (
              <div className="overflow-x-auto my-4 rounded-lg border border-border-secondary shadow-sm">
                <table className={`min-w-full border-collapse bg-bg-primary`} {...props}>
                  {children}
                </table>
              </div>
            );
          },
          thead({ children, ...props }) {
            return (
              <thead className="bg-bg-secondary" {...props}>
                {children}
              </thead>
            );
          },
          tbody({ children, ...props }) {
            return (
              <tbody className="divide-y divide-border-secondary" {...props}>
                {children}
              </tbody>
            );
          },
          tr({ children, ...props }) {
            const isHeaderRow = props.className?.includes('thead') || false;
            return (
              <tr className={`${isHeaderRow ? '' : 'hover:bg-bg-tertiary'} transition-colors duration-150`} {...props}>
                {children}
              </tr>
            );
          },
          th({ children, ...props }) {
            return (
              <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider border-b border-border-secondary" {...props}>
                {children}
              </th>
            );
          },
          td({ children, ...props }) {
            return (
              <td className="px-4 py-3 text-sm text-text-primary whitespace-nowrap" {...props}>
                {children}
              </td>
            );
          },
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(.+)/.exec(className || '');
            
            // Handle chart code blocks
            if (!inline && match) {
              const language = match[1];
              const content = String(children).replace(/\n$/, '');
              
              
              // Check for image format: img{url}
              const imageMatch = /^img\{([^}]+)\}$/.exec(language);
              
              if (imageMatch) {
                const imageUrl = imageMatch[1].trim();
                
                // Validate that we have a URL
                if (!imageUrl) {
                  return (
                    <CodeBlock
                      language={language}
                      className={className}
                      {...props}
                    >
                      {content}
                    </CodeBlock>
                  );
                }
                
                return <EmbeddedImage imageUrl={imageUrl} />;
              }
              
              // Check for expression format: expression{code}
              const expressionMatch = /^expression\{([^}]+)\}$/.exec(language);
              
              if (expressionMatch) {
                const expressionCode = expressionMatch[1].trim();
                
                // Validate that we have a code
                if (!expressionCode) {
                  return (
                    <CodeBlock
                      language={language}
                      className={className}
                      {...props}
                    >
                      {content}
                    </CodeBlock>
                  );
                }
                
                // Memoize expression data to prevent unnecessary re-renders
                const memoizedExpressionData = useMemo(() => ({
                  code: expressionCode,
                  key: `expr-${expressionCode}-${content.substring(0, 10)}`
                }), [expressionCode, content]);
                
                return <ExpressionRenderer key={memoizedExpressionData.key} code={memoizedExpressionData.code} />;
              }
              
              // Check for chart format: chart{attributes} - handle both complete and truncated
              const completeChartMatch = /^chart\{([^}]*)\}$/.exec(language);
              const truncatedChartMatch = /^chart\{(.*)$/.exec(language);
              
              // Try complete match first, then truncated
              const chartFormatMatch = completeChartMatch || truncatedChartMatch;
              
              if (chartFormatMatch) {
                // Detect if this is a truncated chart block
                const isTruncated = !completeChartMatch && truncatedChartMatch;
                
                // Markdown table format with attributes
                const attributeString = chartFormatMatch[1];
                const attributes = parseChartAttributes(attributeString);
                
                // Parse markdown table from content
                const tableData = parseMarkdownTable(content);
                
                // Handle truncated attributes by inferring missing values based on table structure
                if (isTruncated && attributes.type) {
                  // For truncated charts, try to infer missing x/y from table headers
                  const firstRow = tableData[0];
                  if (firstRow) {
                    const columns = Object.keys(firstRow);
                    // Smart attribute inference based on chart type and available columns
                    if (!attributes.x) {
                      if (columns.includes('name')) attributes.x = 'name';
                      else if (columns.includes('month')) attributes.x = 'month'; 
                      else if (columns.includes('date')) attributes.x = 'date';
                      else if (columns.includes('x')) attributes.x = 'x';
                      else attributes.x = columns[0]; // First column as fallback
                    }
                    
                    if (!attributes.y) {
                      // Chart-type specific Y-axis inference
                      if (attributes.type === 'area' && columns.includes('desktop')) {
                        attributes.y = 'desktop';
                      } else if (attributes.type === 'line' && columns.includes('revenue')) {
                        attributes.y = 'revenue';
                      } else if (columns.includes('value')) {
                        attributes.y = 'value';
                      } else if (columns.includes('y')) {
                        attributes.y = 'y';
                      } else if (columns.includes('sales')) {
                        attributes.y = 'sales';
                      } else if (columns.includes('price')) {
                        attributes.y = 'price';
                      } else {
                        // Use the last numeric-looking column or fallback to last column
                        attributes.y = columns[columns.length - 1];
                      }
                    }
                    
                    // Apply default height if missing due to truncation
                    if (!attributes.height) {
                      attributes.height = '320';
                    }
                  }
                }
                
                // Check if we have valid data
                if (tableData.length === 0 || !attributes.type) {
                  // If incomplete or no type specified, render as regular code block
                  return (
                    <CodeBlock
                      language={language}
                      className={className}
                      {...props}
                    >
                      {content}
                    </CodeBlock>
                  );
                }
                
                // Memoize chartData creation
                const memoizedChartData = useMemo(() => {
                  try {
                    // Build chart configuration from attributes
                    const config: any = {
                      title: attributes.title || undefined,
                      xKey: attributes.x || attributes.xKey || 'name',
                      xLabel: attributes.xlabel || undefined,
                      yLabel: attributes.ylabel || undefined,
                      height: attributes.height ? parseInt(attributes.height) : 320,
                    };
                    
                    // Smart multi-series detection for line and area charts
                    if (tableData.length > 0 && (attributes.type === 'line' || attributes.type === 'area')) {
                      const firstRow = tableData[0];
                      const allColumns = Object.keys(firstRow);
                      const xColumn = config.xKey;
                      
                      // Find all numeric columns that aren't the x-axis
                      const numericColumns = allColumns.filter(col => {
                        if (col === xColumn) return false; // Skip x-axis column
                        
                        // Check if column contains numeric data
                        const sampleValue = firstRow[col];
                        return !isNaN(parseFloat(sampleValue)) && isFinite(sampleValue);
                      });
                      
                      // Use multiple columns for multi-series charts
                      if (numericColumns.length > 1) {
                        config.yKey = numericColumns;
                      } else {
                        config.yKey = attributes.y || attributes.yKey || numericColumns[0] || 'value';
                      }
                    } else {
                      // Single series for other chart types
                      config.yKey = attributes.y || attributes.yKey || 'value';
                    }
                    
                    // Handle colors - support multiple colors separated by commas
                    if (attributes.colors) {
                      config.colors = attributes.colors.split(',').map(c => c.trim());
                    } else if (attributes.color) {
                      // Backward compatibility for single color
                      config.colors = [attributes.color];
                    } else {
                      config.colors = ["#8884d8", "#82ca9d", "#ffc658", "#ff7300", "#00ff7f"];
                    }
                    
                    // Remove undefined values
                    Object.keys(config).forEach(key => {
                      if (config[key] === undefined) {
                        delete config[key];
                      }
                    });
                    
                    const chartData: ChartData = {
                      type: attributes.type as any,
                      data: tableData,
                      config
                    };
                    
                    return chartData;
                  } catch (error) {
                    return null;
                  }
                }, [content, attributeString]);
                
                if (memoizedChartData) {
                  const chartKey = `chart-table-${attributes.type}-${content.substring(0, 50)}`;
                  return <ChartRenderer key={chartKey} chartData={memoizedChartData} />;
                } else {
                  return (
                    <CodeBlock
                      language={language}
                      className={className}
                      {...props}
                    >
                      {content}
                    </CodeBlock>
                  );
                }
              }
              
              // Regular code block
              return (
                <CodeBlock
                  language={language}
                  className={className}
                  onCodeUpdate={onCodeUpdate}
                  {...props}
                >
                  {String(children).replace(/\n$/, '')}
                </CodeBlock>
              );
            }
            
            // Inline code
            return (
              <code className={className} {...props}>
                {children}
              </code>
            );
          }
        } as Components}
      />
      
      {/* Add typing indicator if AI message is incomplete */}
      {isIncomplete && (
        <LoadingIndicator type="dots" size="small" />
      )}
    </div>
  );
});

MemoizedMarkdown.displayName = 'MemoizedMarkdown';

export default MemoizedMarkdown;
