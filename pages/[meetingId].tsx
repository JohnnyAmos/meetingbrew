import Calendar from '@/components/Calendar';
import Header from '@/components/Header';
import styles from '@/styles/pages/MeetingPage.module.scss';
import { sampleGradient } from '@/util/sampleGradient';
import { getCurrentTimezone } from '@/util/timezone';
import { Meeting, Respondent } from '@/util/types';
import { collection, doc, getDoc, getDocs, getFirestore, setDoc, updateDoc } from 'firebase/firestore';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useState } from 'react';
import TimezoneSelect from 'react-timezone-select';

export default function MeetingPage() {
  const db = getFirestore();

  const router = useRouter();
  const { meetingId } = router.query;

  const [meeting, setMeeting] = useState<Meeting | null>();
  const [timezone, setTimezone] = useState<string>(getCurrentTimezone());
  const [respondents, setRespondents] = useState<Respondent[]>();
  const [name, setName] = useState<string>();
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);

  // retrieve respondents from firebase
  const getRespondents = useCallback(async () => {
    if (typeof meetingId !== 'string') return;
    const respondentsRef = collection(db, 'meetings', meetingId, 'respondents');
    const respondentsDocs = (await getDocs(respondentsRef)).docs;
    const respondentsData = respondentsDocs.map(doc => doc.data() as Respondent);
    setRespondents(respondentsData);
  }, [meetingId, db]);

  // get respondents on start
  useEffect(() => {
    getRespondents();
  }, [getRespondents]);

  // get meeting on start
  useEffect(() => {
    async function getMeeting() {
      // handle invalid meeting id
      if (!meetingId) return;
      if (typeof meetingId !== 'string') {
        setMeeting(null);
        return;
      }
      // get meeting data
      const meetingRef = doc(db, 'meetings', meetingId);
      const meetingDoc = await getDoc(meetingRef);
      if (!meetingDoc.exists()) {
        setMeeting(null);
        return;
      }
      setMeeting(meetingDoc.data() as Meeting);
    }
    getMeeting();
  }, [meetingId, db]);

  // copies invite link to clipboard
  async function copyLink() {
    await navigator.clipboard.writeText(`https://meetingbrew.com/${meetingId}`);
    window.alert('Copied invite to clipboard!');
  }

  // returns index of respondent by name
  function respondentIndex(name: string) {
    if (!respondents) return -1;
    return respondents.findIndex(r => r.name.toLowerCase() === name.toLowerCase());
  }

  // saves respondent in firebase
  async function saveRespondent() {
    // return if invalid states
    if (typeof meetingId !== 'string' || !respondents || !name) return;
    // get respondent data
    const rIndex = respondentIndex(name);
    if (rIndex === -1) throw 'saving respondent with invalid name';
    const availability = selectedIndices.slice();
    // update local respondent
    const newRespondents = respondents.slice();
    newRespondents[rIndex].availability = availability;
    setRespondents(newRespondents);
    setName(null);
    // update firebase respondent
    const { id } = newRespondents[rIndex];
    const respondentDocRef = doc(db, 'meetings', meetingId, 'respondents', id);
    await updateDoc(respondentDocRef, { availability });
  }

  // creates a new respondent
  async function createRespondent() {
    // return if invalid states
    if (typeof meetingId !== 'string' || !respondents) return;
    // create respondent
    const respondentsRef = collection(db, 'meetings', meetingId, 'respondents');
    const respondentDoc = doc(respondentsRef);
    const { id } = respondentDoc;
    const respondent: Respondent = { id, name: inputName, availability: [] };
    // add user to local respondents
    const newRespondents = respondents.slice();
    newRespondents.push(respondent);
    setRespondents(newRespondents);
    setSelectedIndices([]);
    // reset name input
    setName(inputName);
    setInputtingName(false);
    setInputName('');
    // add user to selected respondents
    const newSelectedRespondents = selectedRespondents.slice();
    newSelectedRespondents.push(id);
    setSelectedRespodents(newSelectedRespondents);
    // add user to firebase respondents
    await setDoc(respondentDoc, respondent);
  }

  // saves input name as current respondent name
  async function saveName() {
    if (!respondents) return;
    // return if input name not set
    if (!inputName) {
      window.alert('Please enter your name.');
      nameRef.current?.focus();
      return;
    }
    // create respondent
    const rIndex = respondentIndex(inputName);
    if (rIndex === -1) createRespondent();
    else {
      setSelectedIndices(respondents[rIndex].availability);
      // reset name input
      setName(inputName);
      setInputtingName(false);
      setInputName('');
    }
  }

  return (
    <div className={styles.container}>
      <Header width={1140} />
      {
        meeting === undefined ? <p>Loading...</p> :
          !meeting ? <p>No meeting found</p> : !respondents ? <p>Loading...</p> :
            <div className={styles.content}>
              <h1>{meeting.title}</h1>
              <div className={styles.options}>
                {
                  name ?
                    <button
                      className={styles.respondButton}
                      onClick={saveRespondent}
                    >
                      <Image src="/icons/check.svg" width="24" height="24" alt="check.svg" />
                      Save
                    </button> :
                    <button
                      className={styles.respondButton}
                      onClick={getName}
                    >
                      <Image src="/icons/calendar.svg" width="24" height="24" alt="calendar.svg" />
                      Respond
                    </button>
                }
                <button
                  className={styles.inviteButton}
                  onClick={copyLink}
                >
                  <Image src="/icons/link.svg" width="24" height="24" alt="link.svg" />
                  Invite
                </button>
                <div className={styles.availability}>
                  <p>0/{respondents.length}</p>
                  <div className={styles.shades}>
                    {
                      Array(respondents.length + 1).fill(0).map((v, i) =>
                        <div
                          className={styles.shade}
                          style={{ background: sampleGradient(respondents.length)[i] }}
                          key={i}
                        />
                      )
                    }
                  </div>
                  <p>{respondents.length}/{respondents.length}</p>
                </div>
                <TimezoneSelect
                  value={timezone}
                  onChange={tz => setTimezone(tz.value)}
                  instanceId="select-currenttimezone"
                  className={styles.select}
                  styles={{
                    control: baseStyles => ({
                      ...baseStyles,
                      height: '48px',
                      borderRadius: 0,
                      background: '#f0f0f0',
                      border: '1px solid #d0d0d0'
                    }),
                    singleValue: baseStyles => ({
                      ...baseStyles,
                      fontWeight: 700,
                      color: '#666'
                    })
                  }}
                />
              </div>
              <div className={styles.content}>
                <div className={styles.respondents}>
                  {
                    respondents.map((respondent, i) =>
                      <div key={i}>
                        {respondent.name}
                      </div>
                    )
                  }
                </div>
                {
                  name ?
                    <Calendar
                      {...meeting}
                      currentTimezone={timezone}
                      type="select"
                      selectedIndices={selectedIndices}
                      setSelectedIndices={setSelectedIndices}
                    /> :
                    <Calendar
                      {...meeting}
                      currentTimezone={timezone}
                      type="display"
                      respondents={respondents}
                    />
                }
              </div>
            </div>
      }
    </div>
  );
}
