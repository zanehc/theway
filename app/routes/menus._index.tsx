import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, useFetcher } from "@remix-run/react";
import { useState, useEffect } from "react";
import { supabase } from "~/lib/supabase";
import { uploadMenuImage, deleteMenuImage } from "~/lib/supabase";
import Header from "~/components/Header";
import type { Menu } from "~/types";

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const { data: menus, error } = await supabase
      .from('menus')
      .select('*')
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (error) throw error;

    return json({ menus: menus || [] });
  } catch (error) {
    console.error('Menus loader error:', error);
    return json({ menus: [] });
  }
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const intent = formData.get('intent') as string;

  if (intent === 'createMenu') {
    try {
      const name = formData.get('name') as string;
      const description = formData.get('description') as string;
      const price = parseInt(formData.get('price') as string);
      const category = formData.get('category') as string;
      const imageFile = formData.get('image') as File | null;

      if (!name || !price || !category) {
        return json({ error: '필수 필드를 입력해주세요.' }, { status: 400 });
      }

      // 메뉴 생성
      const { data: menu, error: menuError } = await supabase
        .from('menus')
        .insert({
          name,
          description: description || null,
          price,
          category,
          image_url: null
        })
        .select()
        .single();

      if (menuError) throw menuError;

      // 이미지 업로드
      let imageUrl = null;
      if (imageFile && imageFile.size > 0) {
        imageUrl = await uploadMenuImage(imageFile, menu.id);
        
        if (imageUrl) {
          await supabase
            .from('menus')
            .update({ image_url: imageUrl })
            .eq('id', menu.id);
        }
      }

      return redirect('/menus');
    } catch (error) {
      console.error('Create menu error:', error);
      return json({ error: '메뉴 생성에 실패했습니다.' }, { status: 400 });
    }
  }

  if (intent === 'updateMenu') {
    try {
      console.log('=== UPDATE MENU ACTION START ===');
      const id = formData.get('id') as string;
      const name = formData.get('name') as string;
      const description = formData.get('description') as string;
      const price = parseInt(formData.get('price') as string);
      const category = formData.get('category') as string;
      const imageFile = formData.get('image') as File | null;
      const removeImage = formData.get('removeImage') === 'true';
      const hasNewImage = formData.get('hasNewImage') === 'true';

      console.log('Form data:', { id, name, description, price, category, removeImage, hasNewImage });
      console.log('Image file:', imageFile ? { name: imageFile.name, size: imageFile.size } : 'null');

      if (!id || !name || !price || !category) {
        console.log('Validation failed');
        return json({ error: '필수 필드를 입력해주세요.' }, { status: 400 });
      }

      const updateData: any = {
        name,
        description: description || null,
        price,
        category
      };

      console.log('Initial update data:', updateData);

      // 기존 메뉴 정보 가져오기
      const { data: existingMenu, error: fetchError } = await supabase
        .from('menus')
        .select('image_url')
        .eq('id', id)
        .single();

      if (fetchError) {
        console.error('Error fetching existing menu:', fetchError);
        return json({ error: '기존 메뉴 정보를 가져오는데 실패했습니다.' }, { status: 400 });
      }

      console.log('Existing menu:', existingMenu);

      // 이미지 처리
      if (removeImage && !hasNewImage) {
        console.log('Removing existing image only (no new image):', existingMenu?.image_url);
        // 기존 이미지만 삭제
        if (existingMenu?.image_url) {
          const deleteResult = await deleteMenuImage(existingMenu.image_url);
          console.log('Delete result:', deleteResult);
        }
        updateData.image_url = null;
      } else if (imageFile && imageFile.size > 0) {
        console.log('Uploading new image for menu:', id);
        // 새 이미지 업로드
        const imageUrl = await uploadMenuImage(imageFile, id);
        console.log('Upload result:', imageUrl);
        if (imageUrl) {
          // 기존 이미지가 있으면 삭제
          if (existingMenu?.image_url) {
            console.log('Deleting old image:', existingMenu.image_url);
            await deleteMenuImage(existingMenu.image_url);
          }
          updateData.image_url = imageUrl;
        }
      } else if (removeImage && hasNewImage) {
        console.log('Both remove and new image selected - prioritizing new image upload');
        // 새 이미지가 선택되었지만 업로드 실패한 경우 처리
        if (existingMenu?.image_url) {
          console.log('Keeping existing image due to upload failure');
        }
      }

      console.log('Final update data:', updateData);

      const { error: updateError } = await supabase
        .from('menus')
        .update(updateData)
        .eq('id', id);

      if (updateError) {
        console.error('Database update error:', updateError);
        throw updateError;
      }

      console.log('=== UPDATE MENU ACTION SUCCESS ===');
      return redirect('/menus');
    } catch (error) {
      console.error('Update menu error:', error);
      return json({ error: '메뉴 수정에 실패했습니다.' }, { status: 400 });
    }
  }

  if (intent === 'deleteMenu') {
    try {
      const id = formData.get('id') as string;
      const imageUrl = formData.get('imageUrl') as string;

      // 이미지 삭제
      if (imageUrl) {
        await deleteMenuImage(imageUrl);
      }

      // 메뉴 삭제
      const { error } = await supabase
        .from('menus')
        .delete()
        .eq('id', id);

      if (error) throw error;

      return redirect('/menus');
    } catch (error) {
      console.error('Delete menu error:', error);
      return json({ error: '메뉴 삭제에 실패했습니다.' }, { status: 400 });
    }
  }

  return json({ error: '잘못된 요청입니다.' }, { status: 400 });
}

export default function Menus() {
  const { menus } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingMenu, setEditingMenu] = useState<Menu | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // 에러 메시지 표시
  useEffect(() => {
    const actionData = fetcher.data as { error?: string } | undefined;
    if (actionData?.error) {
      alert(actionData.error);
    }
  }, [fetcher.data]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // 파일 크기 체크 (5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('이미지 파일 크기는 5MB 이하여야 합니다.');
        e.target.value = '';
        return;
      }
      
      // 파일 타입 체크
      if (!file.type.startsWith('image/')) {
        alert('이미지 파일만 업로드 가능합니다.');
        e.target.value = '';
        return;
      }
      
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setSelectedImage(null);
      setImagePreview(null);
    }
  };

  const resetImageInput = () => {
    setSelectedImage(null);
    setImagePreview(null);
    // 파일 입력 필드 초기화
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    console.log('Form submission - intent:', formData.get('intent'));
    console.log('Form submission - id:', formData.get('id'));
    console.log('Form submission - removeImage:', formData.get('removeImage'));
    console.log('Selected image:', selectedImage);
    
    if (selectedImage) {
      formData.set('image', selectedImage);
      console.log('Image file added to form:', selectedImage.name, selectedImage.size);
    }

    fetcher.submit(formData, { method: 'post' });
  };

  const categories = [
    { id: 'hot coffee', name: 'Hot 커피' },
    { id: 'ice coffee', name: 'Ice 커피' },
    { id: 'tea', name: '차' },
    { id: 'beverage', name: '음료' }
  ];

  return (
    <div className="min-h-screen bg-gradient-warm">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 py-6 sm:py-12">
        <div className="mb-8 sm:mb-12 animate-fade-in">
          <h1 className="text-3xl sm:text-5xl font-black text-wine-800 mb-2 sm:mb-4 tracking-tight">메뉴 관리</h1>
          <p className="text-lg sm:text-2xl text-wine-600 font-medium">카페 메뉴를 관리하세요</p>
        </div>

        <div className="mb-6 sm:mb-8">
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-gradient-wine text-ivory-50 px-6 py-3 rounded-xl font-bold hover:shadow-wine transition-all duration-300 transform hover:-translate-y-1 shadow-medium"
          >
            새 메뉴 추가
          </button>
        </div>

                          {/* 메뉴 목록 */}
         <div className="grid grid-cols-4 gap-2 sm:gap-3">
           {menus.map((menu) => (
             <div key={menu.id} className="bg-gradient-ivory rounded-lg shadow-soft p-2 sm:p-3 border border-ivory-200/50">
               <div className="h-20 sm:h-24 overflow-hidden bg-gradient-to-br from-ivory-100 to-ivory-200 rounded-lg mb-2 flex items-center justify-center">
                 {menu.image_url ? (
                   <img 
                     src={menu.image_url} 
                     alt={menu.name} 
                     className="w-full h-full object-cover"
                   />
                 ) : (
                   <div className="w-full h-full flex items-center justify-center">
                     <svg className="w-6 h-6 sm:w-8 sm:h-8 text-wine-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                     </svg>
                   </div>
                 )}
               </div>
               
               <h3 className="text-xs sm:text-sm font-bold text-wine-800 mb-1 truncate">{menu.name}</h3>
               {menu.description && (
                 <p className="text-gray-600 text-xs mb-1 line-clamp-1">{menu.description}</p>
               )}
               <div className="flex justify-between items-center mb-2">
                 <span className={`text-xs px-1 py-0.5 rounded-full font-medium ${
                   menu.category === 'hot coffee' ? 'bg-red-100 text-red-800' :
                   menu.category === 'ice coffee' ? 'bg-blue-100 text-blue-800' :
                   menu.category === 'tea' ? 'bg-orange-100 text-orange-800' :
                   menu.category === 'beverage' ? 'bg-green-100 text-green-800' :
                   'bg-gray-100 text-gray-600'
                 }`}>
                   {menu.category === 'hot coffee' ? 'Hot' :
                    menu.category === 'ice coffee' ? 'Ice' :
                    menu.category === 'tea' ? '차' :
                    menu.category === 'beverage' ? '음료' : menu.category}
                 </span>
                 <span className="text-xs sm:text-sm font-bold text-wine-700">₩{menu.price.toLocaleString()}</span>
               </div>
               
               <div className="flex gap-1">
                 <button
                   onClick={() => {
                     setEditingMenu(menu);
                     setSelectedImage(null);
                     setImagePreview(null);
                   }}
                   className="flex-1 bg-wine-100 text-wine-700 py-1 px-2 rounded font-bold hover:bg-wine-200 transition-colors text-xs"
                 >
                   수정
                 </button>
                 <fetcher.Form method="post" className="flex-1">
                   <input type="hidden" name="intent" value="deleteMenu" />
                   <input type="hidden" name="id" value={menu.id} />
                   <input type="hidden" name="imageUrl" value={menu.image_url || ''} />
                   <button
                     type="submit"
                     onClick={(e) => {
                       if (!confirm('정말 삭제하시겠습니까?')) {
                         e.preventDefault();
                       }
                     }}
                     className="w-full bg-red-100 text-red-700 py-1 px-2 rounded font-bold hover:bg-red-200 transition-colors text-xs"
                   >
                     삭제
                   </button>
                 </fetcher.Form>
               </div>
             </div>
           ))}
         </div>

                 {/* 새 메뉴 추가 모달 */}
         {showCreateModal && (
           <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
             <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
               <h2 className="text-2xl font-black text-wine-800 mb-6">새 메뉴 추가</h2>
               
               <fetcher.Form method="post" onSubmit={handleSubmit} className="space-y-4">
                 <input type="hidden" name="intent" value="createMenu" />
                 
                 <div>
                   <label className="block text-sm font-bold text-wine-700 mb-2">메뉴명 *</label>
                   <input
                     type="text"
                     name="name"
                     required
                     className="w-full px-4 py-3 border border-ivory-300 rounded-lg text-base font-medium bg-white text-black focus:outline-none focus:ring-2 focus:ring-wine-500"
                   />
                 </div>

                 <div>
                   <label className="block text-sm font-bold text-wine-700 mb-2">설명</label>
                   <textarea
                     name="description"
                     rows={3}
                     className="w-full px-4 py-3 border border-ivory-300 rounded-lg text-base font-medium bg-white text-black focus:outline-none focus:ring-2 focus:ring-wine-500 resize-none"
                   />
                 </div>

                 <div>
                   <label className="block text-sm font-bold text-wine-700 mb-2">가격 *</label>
                   <input
                     type="number"
                     name="price"
                     required
                     min="0"
                     className="w-full px-4 py-3 border border-ivory-300 rounded-lg text-base font-medium bg-white text-black focus:outline-none focus:ring-2 focus:ring-wine-500"
                   />
                 </div>

                 <div>
                   <label className="block text-sm font-bold text-wine-700 mb-2">카테고리 *</label>
                   <select
                     name="category"
                     required
                     className="w-full px-4 py-3 border border-ivory-300 rounded-lg text-base font-medium bg-white text-black focus:outline-none focus:ring-2 focus:ring-wine-500"
                   >
                     <option value="" className="text-black">카테고리 선택</option>
                     {categories.map((category) => (
                       <option key={category.id} value={category.id} className="text-black">
                         {category.name}
                       </option>
                     ))}
                   </select>
                 </div>

                 <div>
                   <label className="block text-sm font-bold text-wine-700 mb-2">이미지</label>
                   <input
                     type="file"
                     accept="image/*"
                     onChange={handleImageChange}
                     className="w-full px-4 py-3 border border-ivory-300 rounded-lg text-base font-medium bg-white text-black focus:outline-none focus:ring-2 focus:ring-wine-500"
                   />
                   {imagePreview && (
                     <div className="mt-2">
                       <img src={imagePreview} alt="Preview" className="w-20 h-20 object-cover rounded-lg" />
                     </div>
                   )}
                 </div>

                 <div className="flex gap-3 pt-4">
                   <button
                     type="button"
                     onClick={() => {
                       setShowCreateModal(false);
                       setSelectedImage(null);
                       setImagePreview(null);
                     }}
                     className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-bold hover:bg-gray-200 transition-colors"
                   >
                     취소
                   </button>
                   <button
                     type="submit"
                     disabled={fetcher.state === 'submitting'}
                     className="flex-1 bg-gradient-wine text-ivory-50 py-3 px-4 rounded-lg font-bold hover:shadow-wine transition-all duration-300 disabled:opacity-50"
                   >
                     {fetcher.state === 'submitting' ? '추가 중...' : '추가'}
                   </button>
                 </div>
               </fetcher.Form>
             </div>
           </div>
         )}

                 {/* 메뉴 수정 모달 */}
         {editingMenu && (
           <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
             <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
               <h2 className="text-2xl font-black text-wine-800 mb-6">메뉴 수정</h2>
               
               <fetcher.Form method="post" onSubmit={handleSubmit} className="space-y-4">
                 <input type="hidden" name="intent" value="updateMenu" />
                 <input type="hidden" name="id" value={editingMenu.id} />
                 <input type="hidden" name="removeImage" value={editingMenu.image_url === null ? 'true' : 'false'} />
                 <input type="hidden" name="hasNewImage" value={selectedImage ? 'true' : 'false'} />
                 
                 <div>
                   <label className="block text-sm font-bold text-wine-700 mb-2">메뉴명 *</label>
                   <input
                     type="text"
                     name="name"
                     defaultValue={editingMenu.name}
                     required
                     className="w-full px-4 py-3 border border-ivory-300 rounded-lg text-base font-medium bg-white text-black focus:outline-none focus:ring-2 focus:ring-wine-500"
                   />
                 </div>

                 <div>
                   <label className="block text-sm font-bold text-wine-700 mb-2">설명</label>
                   <textarea
                     name="description"
                     defaultValue={editingMenu.description || ''}
                     rows={3}
                     className="w-full px-4 py-3 border border-ivory-300 rounded-lg text-base font-medium bg-white text-black focus:outline-none focus:ring-2 focus:ring-wine-500 resize-none"
                   />
                 </div>

                 <div>
                   <label className="block text-sm font-bold text-wine-700 mb-2">가격 *</label>
                   <input
                     type="number"
                     name="price"
                     defaultValue={editingMenu.price}
                     required
                     min="0"
                     className="w-full px-4 py-3 border border-ivory-300 rounded-lg text-base font-medium bg-white text-black focus:outline-none focus:ring-2 focus:ring-wine-500"
                   />
                 </div>

                 <div>
                   <label className="block text-sm font-bold text-wine-700 mb-2">카테고리 *</label>
                   <select
                     name="category"
                     defaultValue={editingMenu.category}
                     required
                     className="w-full px-4 py-3 border border-ivory-300 rounded-lg text-base font-medium bg-white text-black focus:outline-none focus:ring-2 focus:ring-wine-500"
                   >
                     {categories.map((category) => (
                       <option key={category.id} value={category.id} className="text-black">
                         {category.name}
                       </option>
                     ))}
                   </select>
                 </div>

                 <div>
                   <label className="block text-sm font-bold text-wine-700 mb-2">이미지</label>
                   {editingMenu.image_url && (
                     <div className="mb-2">
                       <img src={editingMenu.image_url} alt="Current" className="w-20 h-20 object-cover rounded-lg" />
                       <p className="text-xs text-gray-500 mt-1">현재 이미지</p>
                       <button
                         type="button"
                         onClick={() => {
                           if (confirm('현재 이미지를 삭제하시겠습니까?')) {
                             console.log('Removing image from editing menu');
                             setEditingMenu({ ...editingMenu, image_url: null });
                             resetImageInput();
                           }
                         }}
                         className="mt-1 text-xs text-red-600 hover:text-red-800 font-medium"
                       >
                         현재 이미지 삭제
                       </button>
                     </div>
                   )}
                   <input
                     type="file"
                     accept="image/*"
                     onChange={handleImageChange}
                     className="w-full px-4 py-3 border border-ivory-300 rounded-lg text-base font-medium bg-white text-black focus:outline-none focus:ring-2 focus:ring-wine-500"
                   />
                   {imagePreview && (
                     <div className="mt-2">
                       <img src={imagePreview} alt="Preview" className="w-20 h-20 object-cover rounded-lg" />
                       <p className="text-xs text-gray-500 mt-1">새 이미지 미리보기</p>
                     </div>
                   )}
                 </div>

                 <div className="flex gap-3 pt-4">
                   <button
                     type="button"
                     onClick={() => {
                       setEditingMenu(null);
                       setSelectedImage(null);
                       setImagePreview(null);
                     }}
                     className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-bold hover:bg-gray-200 transition-colors"
                   >
                     취소
                   </button>
                   <button
                     type="submit"
                     disabled={fetcher.state === 'submitting'}
                     className="flex-1 bg-gradient-wine text-ivory-50 py-3 px-4 rounded-lg font-bold hover:shadow-wine transition-all duration-300 disabled:opacity-50"
                   >
                     {fetcher.state === 'submitting' ? '수정 중...' : '수정'}
                   </button>
                 </div>
               </fetcher.Form>
             </div>
           </div>
         )}
      </main>
    </div>
  );
} 