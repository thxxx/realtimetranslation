/* eslint-disable react/destructuring-assignment */
/* eslint-disable prefer-template */
/* eslint-disable jsx-a11y/label-has-associated-control */
import styled from 'styled-components';

export enum SwitchType {
  Square = '',
  Rounded = 'round',
  Stripped = 'strip',
}

interface IToggleSwitchProps {
  type: SwitchType;
}

const ToggleSwitch = (props: IToggleSwitchProps) => (
  <ToggleContainer>
    <label className={'switch ' + props.type}>
      <input type="checkbox" />
      <span className={'slider ' + props.type} />
    </label>
  </ToggleContainer>
);

export default ToggleSwitch;

const ToggleContainer = styled.div`
  .switch {
    position: relative;
    display: inline-block;
    width: 32px;
    height: 18px;
    margin: 0px 0;
  }

  .switch input {
    display: none;
  }

  .slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #000;
    -webkit-transition: 0.4s;
    transition: 0.4s;
  }

  .slider:before {
    position: absolute;
    content: '';
    height: 14px;
    width: 14px;
    left: 2px;
    bottom: 2px;
    background-color: #fff;
    -webkit-transition: 0.4s;
    transition: 0.4s;
  }

  input:checked + .slider {
    background-color: rgba(20, 195, 20, 1);
  }

  input:focus + .slider {
    box-shadow: 0 0 1px #2196f3;
  }

  input:checked + .slider:before {
    -webkit-transform: translateX(14px);
    -ms-transform: translateX(14px);
    transform: translateX(14px);
  }

  /* Rounded sliders */
  .slider.round {
    border-radius: 8.5px;
  }

  .slider.round:before {
    border-radius: 50%;
  }

  /* Strip */
  .switch.strip {
    height: 6.25px;
  }

  .slider.strip {
    border-radius: 3.75px;
  }

  .slider.strip:before {
    background: #fff;
    box-shadow: 0 0 2.5px 0.75px #ccc;
    border-radius: 50%;
    bottom: -2.25px;
  }
`;
