import { Flex, Button, useDisclosure } from "@chakra-ui/react";
import React, { useEffect, useState } from "react";
import { OverviewContainer, ZoomviewContainer } from "./styled";
import { SegmentDragEvent, WaveformViewMouseEvent } from "peaks.js";
import ClipGrid from "./components/ClipGrid";
import { audioData } from "../../data/segmentData";

import ClipGridHeader from "./components/ClipGridHeader";
import InvalidTCPositionModal from "./modals/InvalidTCPositionModal";
import InvalidTopTailEndTimeModal from "./modals/InvalidTopTailEndTimeModal";

import { usePeaksInstance } from "../../hooks/usePeaksInstance";
import { useWaveform } from "../../hooks/useWaveform";
import { useInvalidTCPModal } from "../../hooks/useInvalidTCPModal";

export default function WaveForm() {
  //booleans to open modal for invalid playhead positions when adding segments
  // const {
  //   isOpen: isInvalidTCPModalOpen,
  //   onClose: onInvalidTCPModalClose,
  //   onOpen: onInvalidTCPModalOpen,
  // } = useDisclosure();
  const {
    isInvalidTCPModalOpen,
    onInvalidTCPModalClose,
    onInvalidTCPModalOpen,
  } = useInvalidTCPModal();

  //booleans to open modal for invalid playhead position for adding endtime to Top and Tail clip
  const {
    isOpen: isInvalidTopTailModalOpen,
    onClose: onInvalidTopTailModalClose,
    onOpen: onInvalidTopTailModalOpen,
  } = useDisclosure();

  //create references to peaks.js containers
  const zoomviewWaveformRef = React.createRef<HTMLDivElement>();
  const overviewWaveformRef = React.createRef<HTMLDivElement>();
  const audioElementRef = React.createRef<HTMLAudioElement>();

  const [clipOverlap, setClipOverlap] = useState<boolean>(false);

  //custom hook to initialise a peaks instance with reference to component elements
  const { myPeaks, segments, setSegments, invalidFilename } = usePeaksInstance(
    zoomviewWaveformRef,
    overviewWaveformRef,
    audioElementRef
  );

  // custom hook to return waveform utilitiy functions
  const {
    createTopTail,
    editClipStartPoint,
    editClipEndPoint,
    handleAddSegment,
    deleteAllSegments,
    createAllSegments,
    handlePlayheadSeek,
    deleteSingleSegment,
    createSingleSegment,
    handleFileNameChange,
  } = useWaveform(myPeaks!, segments, setSegments);

  //////////////////////////////////////////////////////////////////////
  //
  //
  //         functions used for peaks instance.on events
  //
  //
  //sets the new start time for a segment if the start point is dragged
  //sets the new end time for a segment if the end point is dragged
  // eslint-disable-next-line
  const handleClipDragEnd = (evt: SegmentDragEvent) => {
    evt.startMarker ? editClipStartPoint(evt) : editClipEndPoint(evt);
  };

  //Adds a new segment to the zoomview on double clicked
  // eslint-disable-next-line
  const handleZoomviewDblClick = () => {
    segments.length >= 1 &&
      handleAddSegment(onInvalidTCPModalOpen, setClipOverlap);
  };

  // eslint-disable-next-line
  const handleOverviewClick = (evt: WaveformViewMouseEvent) => {
    //This conditional disables the single click the top and tail clip is created but
    //will still allow it to be called one more time to create an updated ent time
    //This means the double click to create clip can be placed anywhere on the overview timeline
    //after first clip is created

    if (
      segments.length < 1 ||
      myPeaks?.player.getDuration()! === segments[0].endTime
    ) {
      createTopTail(evt.time, onInvalidTopTailModalOpen);
    }
  };
  //////////////////////////////////////////////////////////////////////

  useEffect(() => {
    //event handlers
    myPeaks?.on("segments.dragend", handleClipDragEnd);
    myPeaks?.on("zoomview.dblclick", handleZoomviewDblClick);
    myPeaks?.on("overview.dblclick", handleZoomviewDblClick);
    myPeaks?.on("overview.click", handleOverviewClick);

    return () => {
      //cleanup
      myPeaks?.off("segments.dragend", handleClipDragEnd);
      myPeaks?.off("zoomview.dblclick", handleZoomviewDblClick);
      myPeaks?.off("overview.dblclick", handleZoomviewDblClick);
      myPeaks?.off("overview.click", handleOverviewClick);
    };
  }, [myPeaks, handleClipDragEnd, handleZoomviewDblClick, handleOverviewClick]);

  return (
    <>
      {/* Moodal to display when clip creation location is invalid */}
      <InvalidTCPositionModal
        isOpen={isInvalidTCPModalOpen}
        onClose={onInvalidTCPModalClose}
        clipOverlap={clipOverlap}
        myPeaks={myPeaks!}
      />
      {/* Moodal to display when Top and Tail end time is set before start time */}
      <InvalidTopTailEndTimeModal
        isOpen={isInvalidTopTailModalOpen}
        onClose={onInvalidTopTailModalClose}
        myPeaks={myPeaks!}
      />
      <Flex
        justify={"center"}
        align={"center"}
        width={"100%"}
        direction={"column"}
        p={"1rem"}
      >
        <ZoomviewContainer ref={zoomviewWaveformRef}></ZoomviewContainer>
        <OverviewContainer ref={overviewWaveformRef}></OverviewContainer>
        <audio ref={audioElementRef} hidden>
          <source src={audioData.audioUrl} type={audioData.audioContentType} />
          Your browser does not support the audio element.
        </audio>
      </Flex>
      <Flex mb={"1rem"} px={"3rem"} w={"100%"} justify={"space-between"}>
        <Flex>
          <Button
            variant={"waveformBlue"}
            onClick={() =>
              handleAddSegment(onInvalidTCPModalOpen, setClipOverlap)
            }
          >
            Add Segment
          </Button>
        </Flex>
        <Flex>
          <Button
            isDisabled={invalidFilename || segments.length < 1}
            variant={"waveformBlue"}
            me={"1rem"}
            onClick={createAllSegments}
          >
            Create All
          </Button>
          <Button
            isDisabled={segments.length < 1}
            variant={"waveformBlue"}
            onClick={deleteAllSegments}
          >
            Delete All
          </Button>
        </Flex>
      </Flex>
      {segments.length !== 0 ? <ClipGridHeader /> : "There are no clips loaded"}
      {segments.length > 0 && (
        <ClipGrid
          segments={segments}
          setSegments={setSegments}
          myPeaks={myPeaks!}
          handlePlayheadSeek={handlePlayheadSeek}
          deleteSingleSegment={deleteSingleSegment}
          createSingleSegment={createSingleSegment}
          handleFileNameChange={handleFileNameChange}
        />
      )}
    </>
  );
}
