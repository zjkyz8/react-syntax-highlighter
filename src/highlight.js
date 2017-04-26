import React from 'react';
import createElement from './create-element';

const newLineRegex = /\n/g;
function getNewLines(str) {
  return str.match(newLineRegex);
}


function getLineNumbers({ lines, startingLineNumber, style, onLineClick }) {
  return lines.map((_, i) => {
    const number = _.ln || '';
    return (
      <span 
        key={`line-${i}`}
        className='react-syntax-highlighter-line-number' 
        style={typeof style === 'function' ? style(number) : style}
        onClick={onLineClick.bind(this, i)}
      >
        {`${number}\n`}
      </span> 
    );
  });
}

function LineNumbers({ 
  codes, 
  containerStyle = {float: 'left', paddingRight: '10px'}, 
  numberStyle = {},
  onLineClick,
  startingLineNumber 
}) {
  return (
    <code style={containerStyle}>
      {getLineNumbers({
        lines: codes,
        style: numberStyle,
        startingLineNumber,
        onLineClick
      })}
    </code>
  );
}

function createLineElement({ children, lineNumber, lineStyle, className = [] }) {
  return {
    type: 'element',
    tagName: 'span',
    properties: { 
      className,
      style: (
        typeof lineStyle === 'function'
        ?
        lineStyle(lineNumber)
        :
        lineStyle
      ),
      onClick: (()=>console.log('ddddd')).bind(this)

    },
    children
  }
}

function flattenCodeTree(tree, className = [], newTree = []) {
  for (let i = 0; i < tree.length; i++) {
    const node = tree[i];
    if (node.type === 'text') {
      newTree.push(createLineElement({ 
        children: [node],
        lineStyle: {},
        className
      }));
    }
    else if (node.children) {
      const classNames = className.concat(node.properties.className);
      newTree = newTree.concat(flattenCodeTree(node.children, classNames));
    }
  }
  return newTree;
}

function wrapLinesInSpan(codeTree, lineStyle) {
  const tree = flattenCodeTree(codeTree.value);
  const { newTree, lastLineBreakIndex } = tree.reduce(({ newTree, lastLineBreakIndex }, node, index) => {
    const value = node.children[0].value;
    const newLines = getNewLines(value);
    if (newLines) {
      const splitValue = value.split('\n');
      splitValue.forEach((text, i) => {
        const lineNumber = newTree.length + 1;
        const newChild = { type: 'text', value: `${text}\n`};
        if (i === 0) {
          const children = tree.slice(
            lastLineBreakIndex + 1, 
            index
          ).concat(newChild);          
          newTree.push(createLineElement({ children, lineNumber, lineStyle})); 
        } else if (i === splitValue.length - 1) {
          const stringChild = (
            tree[index + 1] && 
            tree[index + 1].children && 
            tree[index + 1].children[0]
          );
          if (stringChild) {
            stringChild.value = `${text}${stringChild.value}`;
          } else {
            newTree.push(createLineElement({ children: [newChild], lineNumber, lineStyle })); 
          }
        } else {
          newTree.push(createLineElement({ children: [newChild], lineNumber, lineStyle })); 
        }
      });
      lastLineBreakIndex = index;
    }
    return { newTree, lastLineBreakIndex };
  }, { newTree: [], lastLineBreakIndex: -1 });
  if (lastLineBreakIndex !== tree.length - 1) {
    const children = tree.slice(lastLineBreakIndex + 1, tree.length);
    if (children && children.length) {
      newTree.push(createLineElement({ children, lineNumber: newTree.length + 1, lineStyle })); 
    }
  }
  return newTree;
}

function defaultRenderer({ rows, stylesheet, useInlineStyles, onLineClick }) {
  return (
    rows.map((node, i) => createElement({
      node,
      stylesheet,
      useInlineStyles,
      key: `code-segement${i}`,
      onClick: () => onLineClick(i)
    }))
  );
}

export default function (lowlight, defaultStyle) {
 return function SyntaxHighlighter({
  language,
  children,
  style = defaultStyle,
  customStyle = {},
  codeTagProps = {},
  useInlineStyles = true,
  showLineNumbers = false,
  startingLineNumber = 1,
  lineNumberContainerStyle,
  lineNumberStyle,
  wrapLines,
  lineStyle = {},
  onLineClick = (lineNumber) => {console.log(lineNumber + 'clicked')},
  renderer,
  PreTag='pre',
  CodeTag='code',
  ...rest
 }) {
    /* 
     * some custom renderers rely on individual row elements so we need to turn wrapLines on 
     * if renderer is provided and wrapLines is undefined
    */
    wrapLines = renderer && wrapLines === undefined ? true : wrapLines;
    renderer = renderer || defaultRenderer;
    let sourceCode = children.map(code => code.text).join('\n');
    const codeTree = (
      language ? 
      lowlight.highlight(language, sourceCode) : 
      lowlight.highlightAuto(sourceCode)
    );
    const defaultPreStyle = style.hljs || { backgroundColor: '#fff' };
    const preProps = (
      useInlineStyles
      ?
      Object.assign({}, rest, { style: Object.assign({}, defaultPreStyle, customStyle) })
      :
      Object.assign({}, rest, { className: 'hljs'})
    );
    const tree = wrapLines ? wrapLinesInSpan(codeTree, lineStyle) : codeTree.value;

    const lineNumbers = (
      showLineNumbers
      ?
      <LineNumbers
        containerStyle={lineNumberContainerStyle}
        numberStyle={lineNumberStyle}
        startingLineNumber={startingLineNumber}
        codes={children}
        onLineClick={onLineClick}
      />
      :
      null
    );
    return (
      <PreTag {...preProps}>
        {lineNumbers}
        <CodeTag {...codeTagProps}>
          {renderer({ rows: tree, stylesheet: style, useInlineStyles, onLineClick })}
        </CodeTag>
      </PreTag>
    );
  }
}

