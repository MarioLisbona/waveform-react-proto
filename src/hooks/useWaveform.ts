import React from "react";
import { TestSegmentProps } from "../types";
import { PeaksInstance, SegmentDragEvent } from "peaks.js";
import { createNewSegment } from "../lib/general-utils";

export const useWaveform = (
  myPeaks: PeaksInstance,
  segments: TestSegmentProps[],
  setSegments: React.Dispatch<React.SetStateAction<TestSegmentProps[]>>
) => {
  //////////////////////////////////////////////////////////////////////
  //
  //
  //              Create Top and Tail clip on empty timeline
  //
  //
  const createTopTail = (
    mediaLength: number,
    onInvalidTopTailModalOpen: () => void
  ) => {
    const playheadPosition = myPeaks.player.getDuration();
    const topTailSegment = {
      id: "Top-n-Tail-Segment",
      fileName: "Top-n-Tail-Segment",
      startTime: 0,
      endTime: mediaLength,
      editable: true,
      color: "#1E1541",
      labelText: "Top-n-Tail-Segment",
      formErrors: {
        fileNameError: false,
        isCreated: false,
      },
    };

    //segments array is empty, first click becomes the start time
    if (segments.length === 0) {
      topTailSegment.startTime = playheadPosition;
      setSegments([topTailSegment]);
    }

    //segments array contains Top and Tail clip and playhead is at a valid position
    if (segments.length === 1 && playheadPosition > segments[0].startTime) {
      //set the end time for the Top and Tail clip
      //must be greater than 0.05 after start time
      const updatedSegment = segments.map((seg) => {
        return {
          ...seg,
          endTime:
            playheadPosition < seg.startTime + 0.05
              ? seg.endTime
              : playheadPosition,
        };
      });
      //update the segments state
      setSegments(updatedSegment);

      //playhead for end time is before start time, open modal
    } else if (
      segments.length === 1 &&
      playheadPosition < segments[0].startTime
    ) {
      onInvalidTopTailModalOpen();
    }
  };
  //////////////////////////////////////////////////////////////////////

  //////////////////////////////////////////////////////////////////////
  //
  //             Edit segment start points
  //
  //             Handles a clip start point being dragged
  //             to a new position on the zoomview window
  //
  //
  const editClipStartPoint = (evt: SegmentDragEvent) => {
    //id for the current clip being edited
    const segmentId = evt.segment.id;

    const newSegState = segments.map((segment, idx, arr) => {
      if (segment.id === segmentId) {
        //error checking for Top clip else all other clips
        if (idx === 0) {
          return {
            ...segment,
            startTime:
              evt.segment.startTime > segment.endTime - 0.05
                ? segment.startTime
                : evt.segment.startTime,
          };
        } else {
          return {
            ...segment,
            startTime:
              evt.segment.startTime < arr[idx - 1].endTime ||
              evt.segment.startTime > segment.endTime - 0.05
                ? segment.startTime
                : evt.segment.startTime,
          };
        }
      }
      // otherwise return the segment unchanged
      return segment;
    });
    //use the updated segment to update the segments state
    setSegments(newSegState);
  };
  //////////////////////////////////////////////////////////////////////

  //////////////////////////////////////////////////////////////////////
  //
  //             Edit segment end points
  //
  //             Handles a clip end point being dragged
  //             to a new position on the zoomview window
  //
  //

  const editClipEndPoint = (evt: SegmentDragEvent) => {
    //id for the current clip being edited
    const segmentId = evt.segment.id;

    const newSegState = segments.map((segment, idx, arr) => {
      if (segment.id === segmentId) {
        //error checking for Tail clip else all other clips
        if (idx === segments.length - 1) {
          return {
            ...segment,
            endTime:
              evt.segment.endTime < segment.startTime + 0.05
                ? segment.endTime
                : evt.segment.endTime,
          };
        } else {
          return {
            ...segment,
            endTime:
              evt.segment.endTime > arr[idx + 1].startTime ||
              evt.segment.endTime < segment.startTime + 0.05
                ? segment.endTime
                : evt.segment.endTime,
          };
        }
      }
      // otherwise return the segment unchanged
      return segment;
    });
    //use the updated segment to update the segments state
    setSegments(newSegState);
  };
  //////////////////////////////////////////////////////////////////////

  //////////////////////////////////////////////////////////////////////
  //
  //             Add Segment Button
  //
  //             Handles a adding a new segment when the Add Segment
  //             button is clicked and the zoomview or overview timelines are double clicked
  //
  //
  const handleAddSegment = (
    onOpen: () => void,
    setClipOverlap: React.Dispatch<React.SetStateAction<boolean>>
  ) => {
    const firstClip = segments.length === 0;
    const secondClip = segments.length === 1;
    const mediaLength = myPeaks.player.getDuration()!;
    const playheadPosition = myPeaks.player.getCurrentTime();
    const clipUpperBound = playheadPosition + mediaLength * 0.03;
    const timelineUpperBound = mediaLength - 1;

    //function to return true if the timecode is between the start and end of a clip
    const timecodeIsBetweenClip = (
      timecode: number,
      start: number,
      end: number
    ) => {
      return (timecode - start) * (timecode - end) <= 0;
    };

    //map over the segment and call playheadIsBetween
    //if any element is true, the playhead is between the start and end of an existing clip
    const invalidPlayheadPosition = segments
      .map((seg) => {
        return timecodeIsBetweenClip(
          playheadPosition,
          seg.startTime,
          seg.endTime
        );
      })
      .includes(true);

    // Check the gaps between first and last clips to see if they are
    //large enough to contain the new clip length
    // eslint-disable-next-line
    const validGapLength = segments.findIndex((seg, idx, arr) => {
      if (idx + 1 < arr.length) {
        return (
          arr[idx + 1].startTime > clipUpperBound &&
          arr[idx].endTime < playheadPosition
        );
      }
      // console.log("returning seg at end of findIndex", idx);
      // return seg; //---> returning seg here to resolving linting error breaks error checking
    });

    //function to return true if a clip is being created with enough space, prior to the current first clip
    //this needed to be in a function to allow conditional checking of the segments[0] element
    const startClipValidGapLength = () => {
      if (segments.length > 0) {
        return clipUpperBound < segments[0]?.startTime;
      }
    };

    //function to return true if a clip is being created with enough space, after to the current last clip
    //this needed to be in a function to allow conditional checking of the segments[0] element
    const endClipValidGapLength = () => {
      if (segments.length > 0) {
        return (
          clipUpperBound < timelineUpperBound &&
          playheadPosition > segments[segments?.length - 1].startTime
        );
      }
    };

    //create first clip on empty timeline
    if (firstClip && clipUpperBound < timelineUpperBound) {
      const newSegment = createNewSegment(
        segments,
        playheadPosition,
        mediaLength
      );
      //update the segments state
      setSegments([newSegment]);
    } else if (
      //Second Clip being created only if playhead is not between start and end of first clip or upperbound
      //doesnt fall within clip 1
      secondClip &&
      clipUpperBound < timelineUpperBound &&
      !invalidPlayheadPosition &&
      !timecodeIsBetweenClip(
        clipUpperBound,
        segments[0].startTime,
        segments[0].endTime
      )
    ) {
      const newSegment = createNewSegment(
        segments,
        playheadPosition,
        mediaLength
      );

      const updatedSegments = [...segments, newSegment];
      //update the segments state
      setSegments(updatedSegments.sort((a, b) => a.startTime - b.startTime));

      //create clips from number 3 and up if playhead is not between start and end of first clip or upperbound
      //doesnt fall within existing clips
    } else if (!invalidPlayheadPosition && validGapLength !== -1) {
      const newSegment = createNewSegment(
        segments,
        playheadPosition,
        mediaLength
      );

      //add new segment to the segments array, sort it by start time and update segments state
      const updatedSegments = [...segments, newSegment];
      setSegments(updatedSegments.sort((a, b) => a.startTime - b.startTime));

      //last conditional is for clips created before or after existing first/last clip
      //validGapLength will always return -1 for clips added in these positions
      //startClipValidGapLength and endClipValidGapLength calls will be true if valid location
    } else if (
      !invalidPlayheadPosition &&
      validGapLength === -1 &&
      (startClipValidGapLength() || endClipValidGapLength())
    ) {
      const newSegment = createNewSegment(
        segments,
        playheadPosition,
        mediaLength
      );

      //add new segment to the segments array, sort it by start time and update segments state
      const updatedSegments = [...segments, newSegment];
      setSegments(updatedSegments.sort((a, b) => a.startTime - b.startTime));
    } else {
      invalidPlayheadPosition ? setClipOverlap(false) : setClipOverlap(true);
      onOpen();
    }
  };
  //////////////////////////////////////////////////////////////////////

  //////////////////////////////////////////////////////////////////////
  //
  //             Delete all segments
  //
  //
  const deleteAllSegments = () => {
    myPeaks.segments.removeAll();
    setSegments([]);
  };
  //////////////////////////////////////////////////////////////////////

  //////////////////////////////////////////////////////////////////////
  //
  //             Create all segments
  //
  //
  // console logs the segments after all edits
  //set segments to empty array and destroy peaks instance to free resources
  const createAllSegments = () => {
    const updatedSegments = segments.map((seg) => {
      return {
        ...seg,
        formErrors: {
          fileNameError: seg.formErrors.fileNameError,
          isCreated: true,
        },
        editable: false,
        color: "#384115",
      };
    });

    setSegments(updatedSegments);
    console.log(
      "Exporting clip data and destroying Peaks instance",
      updatedSegments
    );
    // setSegments([]);
    // peaks?.destroy();
  };
  //////////////////////////////////////////////////////////////////////

  return {
    createTopTail,
    editClipStartPoint,
    editClipEndPoint,
    handleAddSegment,
    deleteAllSegments,
    createAllSegments,
  };
};