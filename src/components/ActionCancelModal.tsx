import { useState } from "react";


interface ActionCancelProps {
    isOpen: boolean;
    onAction(): void;
    onClose(): void;
    message: string;
    note?: string;
}
const ActionCancelModal: React.FC<ActionCancelProps> = ({ isOpen, onAction, onClose, message, note })  => {


  console.log("isModalOpen", isOpen)
  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-gray-900 opacity-70"
            onClick={onClose}
          ></div>
          <div className="bg-white p-4 rounded-md z-50 w-[600px] h-[350px] flex flex-col justify-between">
            <h2 className="text-lg text-center justify-center  font-bold mb-2">FitForm</h2>
            <p className="p-4 text-lg text-center">{message}</p>
            <p className="p-4 text-base text-center">{note}</p>
            <div className="w-full flex justify-around">
                <button
                    onClick={onClose}
                    className="w-1/3 bg-slate-600  hover:bg-slate-700 focus:bg-slate-700 active:bg-slate-800 text-white font-bold py-2 px-4 rounded">
                Cancel
                </button>
                <button
                    onClick={onAction}
                    className="bg-blue-500 w-1/3  hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                OK
                </button>

            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ActionCancelModal;