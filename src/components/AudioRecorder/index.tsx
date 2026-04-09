import React, { useState, useRef, useEffect } from 'react'
import { Button, Space, List, Popconfirm, message, Input, Tag, Empty } from 'antd'
import {
  AudioOutlined,
  AudioMutedOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  DeleteOutlined,
  SaveOutlined,
} from '@ant-design/icons'

interface AudioRecorderProps {
  questionId?: number
  type: 'explanation' | 'answer'
  onRecordingSaved?: (id: number) => void
}

interface AudioRecord {
  id: number
  question_id: number
  type: string
  title: string
  duration: number
  created_at: string
}

const AudioRecorder: React.FC<AudioRecorderProps> = ({ questionId, type, onRecordingSaved }) => {
  const [isRecording, setIsRecording] = useState(false)
  const [isPlaying, setIsPlaying] = useState<number | null>(null)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioRecords, setAudioRecords] = useState<AudioRecord[]>([])
  const [audioURL, setAudioURL] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // 加载已有的录音
  useEffect(() => {
    if (questionId) {
      loadAudioRecords()
    }
  }, [questionId])

  const loadAudioRecords = async () => {
    if (!questionId) return
    try {
      const records = await window.electronAPI.db.audio.getByQuestion(questionId)
      setAudioRecords(records.filter((r: AudioRecord) => r.type === type))
    } catch (error) {
      console.error('Failed to load audio records:', error)
    }
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)

      // 开始计时
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)
    } catch (error) {
      message.error('无法访问麦克风，请检查权限设置')
      console.error('Error accessing microphone:', error)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop())
      setIsRecording(false)

      if (timerRef.current) {
        clearInterval(timerRef.current)
      }

      // 生成音频 URL 用于预览
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        const url = URL.createObjectURL(audioBlob)
        setAudioURL(url)
      }
    }
  }

  const saveRecording = async () => {
    if (!questionId || audioChunksRef.current.length === 0) return

    try {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
      const arrayBuffer = await audioBlob.arrayBuffer()
      const uint8Array = new Uint8Array(arrayBuffer)

      const id = await window.electronAPI.db.audio.create({
        question_id: questionId,
        type,
        duration: recordingTime,
        audio_data: uint8Array,
      })

      message.success('录音已保存')
      setAudioURL(null)
      audioChunksRef.current = []
      setRecordingTime(0)
      loadAudioRecords()

      if (onRecordingSaved && id) {
        onRecordingSaved(id)
      }
    } catch (error) {
      message.error('保存录音失败')
      console.error('Failed to save recording:', error)
    }
  }

  const discardRecording = () => {
    setAudioURL(null)
    audioChunksRef.current = []
    setRecordingTime(0)
  }

  const playAudio = async (record: AudioRecord) => {
    try {
      // 获取音频数据
      const result = await window.electronAPI.db.audio.getAudioData(record.id)
      if (result && result.audio_data) {
        // 将数据转换为 Blob
        const uint8Array = new Uint8Array(Object.values(result.audio_data))
        const blob = new Blob([uint8Array], { type: 'audio/webm' })
        const url = URL.createObjectURL(blob)

        if (audioRef.current) {
          audioRef.current.src = url
          audioRef.current.play()
          setIsPlaying(record.id)
        }
      }
    } catch (error) {
      message.error('播放失败')
      console.error('Failed to play audio:', error)
    }
  }

  const stopPlaying = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
    setIsPlaying(null)
  }

  const deleteRecord = async (id: number) => {
    try {
      await window.electronAPI.db.audio.delete(id)
      message.success('删除成功')
      loadAudioRecords()
    } catch {
      message.error('删除失败')
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      if (audioURL) {
        URL.revokeObjectURL(audioURL)
      }
    }
  }, [audioURL])

  return (
    <div className="space-y-3">
      <audio ref={audioRef} onEnded={() => setIsPlaying(null)} />

      {/* 录音控制 */}
      <div className="flex items-center gap-3">
        {audioURL ? (
          // 预览模式
          <>
            <audio src={audioURL} controls className="flex-1 h-8" />
            <Button type="primary" size="small" icon={<SaveOutlined />} onClick={saveRecording}>
              保存
            </Button>
            <Button size="small" onClick={discardRecording}>
              取消
            </Button>
          </>
        ) : (
          // 录音模式
          <>
            <Button
              type={isRecording ? 'default' : 'primary'}
              danger={isRecording}
              icon={isRecording ? <AudioMutedOutlined /> : <AudioOutlined />}
              onClick={isRecording ? stopRecording : startRecording}
            >
              {isRecording ? '停止' : '录音'}
            </Button>
            {isRecording && (
              <span className="text-red-500 font-mono">
                {formatTime(recordingTime)}
              </span>
            )}
            <Tag color="blue" className="ml-2">
              {type === 'explanation' ? '题目解释' : '口述回答'}
            </Tag>
          </>
        )}
      </div>

      {/* 已保存的录音列表 */}
      {audioRecords.length > 0 && (
        <List
          size="small"
          dataSource={audioRecords}
          renderItem={(record) => (
            <List.Item className="py-2 px-0">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  {isPlaying === record.id ? (
                    <Button
                      type="text"
                      size="small"
                      icon={<PauseCircleOutlined className="text-blue-500" />}
                      onClick={stopPlaying}
                    />
                  ) : (
                    <Button
                      type="text"
                      size="small"
                      icon={<PlayCircleOutlined />}
                      onClick={() => playAudio(record)}
                    />
                  )}
                  <span className="text-gray-600 text-sm">
                    {formatTime(record.duration)}
                  </span>
                  <span className="text-gray-400 text-xs">
                    {new Date(record.created_at).toLocaleString('zh-CN', {
                      month: 'numeric',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <Popconfirm
                  title="确定删除此录音？"
                  onConfirm={() => deleteRecord(record.id)}
                >
                  <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </div>
            </List.Item>
          )}
        />
      )}
    </div>
  )
}

export default AudioRecorder
