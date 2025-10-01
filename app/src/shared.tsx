
import styled from '@emotion/styled';

export const Menu = styled.ul<{ isOpen: boolean }>`
  padding: 0;
  margin-top: 0;
  position: absolute;
  background-color: white;
  width: 100%;
  max-height: 20rem;
  overflow-y: auto;
  overflow-x: hidden;
  outline: 0;
  transition: opacity 0.1s ease;
  border-radius: 0 0 0.28571429rem 0.28571429rem;
  box-shadow: 0 2px 3px 0 rgba(34, 36, 38, 0.15);
  border-color: #96c8da;
  border-top-width: 0;
  border-right-width: 1px;
  border-bottom-width: 1px;
  border-left-width: 1px;
  border-style: solid;
  display: ${props => (props.isOpen ? 'block' : 'none')};
`;

export const ControllerButton = styled.button`
  background-color: transparent;
  border: none;
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  cursor: pointer;
`;

export const Item = styled.li<{ isActive: boolean; isSelected: boolean }>`
  position: relative;
  cursor: pointer;
  display: block;
  border: none;
  height: auto;
  text-align: left;
  border-top: none;
  line-height: 1em;
  color: rgba(0, 0, 0, 0.87);
  font-size: 1rem;
  text-transform: none;
  font-weight: 400;
  box-shadow: none;
  padding: 0.8rem 1.1rem;
  white-space: normal;
  word-wrap: normal;
  background-color: ${props => (props.isActive ? '#f2f2f2' : 'white')};
  font-weight: ${props => (props.isSelected ? 'bold' : 'normal')};
`;

export const ArrowIcon = ({ isOpen }: { isOpen: boolean }) => (
  <svg
    viewBox="0 0 20 20"
    preserveAspectRatio="none"
    width={16}
    fill="transparent"
    stroke="#979797"
    strokeWidth="1.1px"
    transform={isOpen ? 'rotate(180)' : undefined}
  >
    <path d="M1,6 L10,15 L19,6" />
  </svg>
);

export const css = (styles: object) => ({
    css: styles
});

// Mock function for getItems
export const getItems = (allTags: any[], inputValue: string) => {
    return allTags.filter(tag =>
        tag.system.name.toLowerCase().includes(inputValue.toLowerCase())
    );
};

export interface Tag {
    system: {
      id: string;
      name: string;
      codename: string;
    };
    elements: {
      parent_tag?: {
        value: string[];
      };
    };
  }
  
  export interface TagNode extends Tag {
    children: TagNode[];
  }
