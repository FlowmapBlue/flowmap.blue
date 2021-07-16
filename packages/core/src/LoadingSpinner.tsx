import * as React from 'react';
import styled from '@emotion/styled';

const Outer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  height: 100%;
  width: 100%;
`;

const SpinnerSvg = styled.svg`
  margin: auto auto;
  width: 40px;
  height: 40px;
`;

const Loader = () => (
  <Outer>
    <SpinnerSvg width="402px" height="402px" viewBox="0 0 602 602">
      <g transform="translate(100 100)" stroke="none" strokeWidth={1} fill="none">
        <circle stroke="#fff" fill="#fff" opacity={0.5} strokeWidth={0} cx={200} cy={200} r={300} />
        <circle stroke="#fff" fill="#1A70A7" strokeWidth={0} cx={200} cy={200} r={200} />
        <g
          strokeOpacity={0.937273551}
          stroke="#FFF"
          strokeWidth={23}
          strokeLinejoin="round"
          fill="#fff"
        >
          <path d="M265.5 199.045h42.545L216.5 320.411V84.5h49v114.545z">
            <animateTransform
              attributeName="transform"
              type="translate"
              from="0 -400"
              to="0 400"
              begin="0s"
              dur="1s"
              repeatCount="indefinite"
            />
          </path>
          <path d="M135.5 202.955H92.955L184.5 81.589V317.5h-49V202.955z">
            <animateTransform
              attributeName="transform"
              type="translate"
              from="0 400"
              to="0 -400"
              begin="0s"
              dur="1s"
              repeatCount="indefinite"
            />
          </path>
        </g>
      </g>
    </SpinnerSvg>
  </Outer>
);

export default Loader;
