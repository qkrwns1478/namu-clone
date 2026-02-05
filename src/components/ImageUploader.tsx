'use client'

import { uploadImage } from '@/app/actions'
import { useState } from 'react'

export default function ImageUploader() {
  const [uploadedName, setUploadedName] = useState('')

  const handleUpload = async (formData: FormData) => {
    const result = await uploadImage(formData)
    if (result.success && result.filename) {
      setUploadedName(result.filename)
      alert('업로드 성공! 아래 코드를 본문에 복사하세요.')
    } else {
      alert('실패: ' + result.message)
    }
  }

  return (
    <div className="mt-4 p-4 border border-dashed rounded bg-gray-50">
      <h3 className="font-bold text-sm mb-2">이미지 업로드</h3>
      <form action={handleUpload} className="flex gap-2">
        <input type="file" name="file" accept="image/*" className="text-sm" required />
        <button type="submit" className="bg-gray-700 text-white px-3 py-1 text-sm rounded">
          업로드
        </button>
      </form>
      {uploadedName && (
        <div className="mt-2 text-sm">
          <p>삽입 코드:</p>
          <code className="bg-yellow-100 p-1 block mt-1 select-all">
            {'[[파일:' + uploadedName + ']]'}
          </code>
        </div>
      )}
    </div>
  )
}